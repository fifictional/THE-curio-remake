import type { Schema } from "@database-schema";
import { generateClient } from "aws-amplify/api";
import { hasEmbeddingsForDocument, queryRag, queryRagBySpace } from "../../utils/opensearchClient";

/**
 * Update hasRagEmbeddings field for documents that returned RAG hits
 */
export async function updateHasRagEmbeddingsForHits(
  client: ReturnType<typeof generateClient<Schema>>,
  hits: Array<{ chunkText: string; documentUuid: string }>
): Promise<void> {
  const documentsWithHits = Array.from(new Set(hits.map(hit => hit.documentUuid).filter(Boolean))) as string[];
  
  for (const docUuid of documentsWithHits) {
    try {
      const doc = await client.models.Document.get({ documentUuid: docUuid });
      if (!doc.data?.hasRagEmbeddings) {
        await client.models.Document.update({
          documentUuid: docUuid,
          hasRagEmbeddings: true,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`[updateHasRagEmbeddingsForHits] Error updating hasRagEmbeddings for ${docUuid}:`, error);
    }
  }
}

/**
 * Get document names for citation purposes
 */
export async function getDocumentNames(
  client: ReturnType<typeof generateClient<Schema>>,
  documentUuids: Set<string>
): Promise<Map<string, string>> {
  const documentNames = new Map<string, string>();
  const validUuids = Array.from(documentUuids).filter(Boolean) as string[];
  
  for (const docUuid of validUuids) {
    try {
      const doc = await client.models.Document.get({ documentUuid: docUuid });
      documentNames.set(docUuid, doc.data?.fileName || `Document ${docUuid.slice(0, 8)}`);
    } catch (error) {
      documentNames.set(docUuid, `Document ${docUuid.slice(0, 8)}`);
    }
  }
  
  return documentNames;
}

/**
 * Format RAG hits with document context for AI prompt
 * Groups chunks by document with clear section headers
 */
export function formatRagHits(
  hits: Array<{ chunkText: string; documentUuid: string }>,
  documentNames: Map<string, string>
): string {
  // Filter out hits with invalid documentUuid and group by document UUID
  const validHits = hits.filter(hit => hit.documentUuid);
  const hitsByDocument = new Map<string, Array<{ chunkText: string; documentUuid: string }>>();
  
  validHits.forEach((hit) => {
    if (!hitsByDocument.has(hit.documentUuid)) {
      hitsByDocument.set(hit.documentUuid, []);
    }
    hitsByDocument.get(hit.documentUuid)!.push(hit);
  });
  
  // Format chunks grouped by document with clear section headers
  const documentSections: string[] = [];
  
  for (const [docUuid, docHits] of hitsByDocument.entries()) {
    const docName = documentNames.get(docUuid) || `Document ${docUuid.slice(0, 8)}`;
    
    // Create a section header for this document
    const documentSection: string[] = [
      `### Document: ${docName}`,
      ''
    ];
    
    // Add each chunk with spacing between them
    docHits.forEach((hit, index) => {
      documentSection.push(hit.chunkText.trim());
      if (index < docHits.length - 1) {
        documentSection.push(''); // Add spacing between chunks
      }
    });
    
    documentSections.push(documentSection.join('\n'));
  }
  
  return documentSections.join('\n\n---\n\n');
}

/**
 * Calculate the number of RAG hits to retrieve based on the number of documents
 */
function calculateRagHitsCount(documentCount: number): number {
  if (documentCount === 1) {
    return 10;
  } else if (documentCount <= 3) {
    return 5;
  } else if (documentCount <= 5) {
    return 3;
  } else if (documentCount <= 10) {
    return 2;
  } else {
    return 1;
  }
}

/**
 * Fetch document content using RAG search
 */
export async function fetchDocumentContentFromRag(
  client: ReturnType<typeof generateClient<Schema>>,
  userMessage: string,
  userUuid: string,
  documentsToSearch: string[],
): Promise<string | undefined> {
  try {
    // Calculate the number of hits per document based on total document count
    const hitsPerDocument = calculateRagHitsCount(documentsToSearch.length);
    
    // Query RAG for each document individually
    const allHits: Array<{ chunkText: string; documentUuid: string }> = [];
    const documentsWithHits = new Set<string>();
    const documentsWithEmbeddings = new Set<string>();

    for (const docUuid of documentsToSearch) {
      // Check if document has RAG embeddings
      const hasRagEmbeddings = await hasEmbeddingsForDocument(userUuid, docUuid);
      if (!hasRagEmbeddings) {
        console.log(`[fetchDocumentContentFromRag] Document ${docUuid} does not have RAG embeddings`);
        continue;
      }
      
      // Track documents that have embeddings
      documentsWithEmbeddings.add(docUuid);
      
      // Query RAG for this specific document
      const ragRes = await queryRag(
        userMessage,
        userUuid,
        [docUuid],
        hitsPerDocument
      );
      
      if (ragRes.hits && ragRes.hits.length > 0) {
        allHits.push(...ragRes.hits);
        documentsWithHits.add(docUuid);
      }
    }
    
    // If no documents have embeddings, return null so caller can handle differently
    if (documentsWithEmbeddings.size === 0) {
      console.log(`[fetchDocumentContentFromRag] No documents have RAG embeddings: ${documentsToSearch.join(', ')}`);
      return undefined;
    }
    
    // If documents have embeddings but no hits found, return "no results" message
    if (allHits.length === 0) {
      const numDocs = documentsWithEmbeddings.size;
      console.log(`[fetchDocumentContentFromRag] No RAG hits found for documents with embeddings: ${Array.from(documentsWithEmbeddings).join(', ')}`);
      return `## RAG Search Results\n\n` +
        `The ${numDocs === 1 ? 'document does' : 'documents do'} not contain information relevant to your query. ` +
        `The ${numDocs === 1 ? 'document may' : 'documents may'} not cover this topic, or the information may not be available in the indexed content.`;
    }
    
    // Get document names for citations
    const documentNames = await getDocumentNames(client, documentsWithHits);
    
    // Format hits
    const formattedText = formatRagHits(allHits, documentNames);
    const numDocs = documentsWithHits.size;

    console.log(`[fetchDocumentContentFromRag] Formatted text: ${formattedText}`);
    
    // Build a list of document names for better context
    const documentList = Array.from(documentsWithHits).map(docUuid => {
      const docName = documentNames.get(docUuid) || `Document ${docUuid.slice(0, 8)}`;
      return `- ${docName}`;
    }).join('\n');
    
    return `## RAG Search Results\n\n` +
      `I found relevant information from ${numDocs} ${numDocs === 1 ? 'document' : 'documents'}:\n\n${documentList}\n\n` +
      `---\n\n` +
      formattedText +
      `\n\n---\n\n` +
      `**Important:** When responding, please cite the specific document name for each piece of information (e.g., "According to ${documentNames.get(Array.from(documentsWithHits)[0]) || 'Document X'}..." or "As mentioned in ${documentNames.get(Array.from(documentsWithHits)[documentsWithHits.size > 1 ? 1 : 0]) || 'Document Y'}..."). 
       **SUPER IMPORTANT: Make sure to reference information from ALL relevant documents when answering.**`;
  } catch (ragError: any) {
    console.error('[fetchDocumentContentFromRag] Error querying RAG:', ragError.message);
    return undefined;
  }
}

/**
 * Fetch document content from S3 markdown file
 * Supports both new format (userUuid/documentUuid/enriched-markdown.md) and old format (documentUuid/documentUuid/enriched-markdown.md)
 */
export async function fetchDocumentContentFromS3(documentUuid: string, userUuid?: string): Promise<string | undefined> {
  try {
    const { S3Client, GetObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({});
    const bucketName = process.env.AI_TUTOR_STORAGE_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '';
    
    if (!bucketName) {
      return undefined;
    }

    // Try new format first (userUuid/documentUuid/enriched-markdown.md)
    let s3Key: string | null = null;
    if (userUuid) {
      const newFormatKey = `student-documents/${userUuid}/${documentUuid}/enriched-markdown.md`;
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: bucketName,
          Key: newFormatKey,
        }));
        s3Key = newFormatKey;
      } catch (headError: any) {
        // File doesn't exist in new format, will try old format
        if (headError.name !== 'NotFound' && headError.$metadata?.httpStatusCode !== 404) {
          console.log(`[fetchDocumentContentFromS3] Error checking new format for ${newFormatKey}:`, headError.message);
        }
      }
    }

    // Fall back to old format (documentUuid/documentUuid/enriched-markdown.md)
    if (!s3Key) {
      const oldFormatKey = `student-documents/${documentUuid}/${documentUuid}/enriched-markdown.md`;
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: bucketName,
          Key: oldFormatKey,
        }));
        s3Key = oldFormatKey;
      } catch (headError: any) {
        // File doesn't exist in old format either
        if (headError.name !== 'NotFound' && headError.$metadata?.httpStatusCode !== 404) {
          console.log(`[fetchDocumentContentFromS3] Error checking old format for ${oldFormatKey}:`, headError.message);
        }
        return undefined;
      }
    }

    if (!s3Key) {
      return undefined;
    }
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });
    
    const response = await s3Client.send(command);
    if (!response.Body) {
      return undefined;
    }
    
    const bodyContents = await response.Body.transformToString();
    return `## Document Content\n\n` +
      `Here is the full document content:\n\n` +
      bodyContents +
      `\n\n---\n\n` +
      `**Important:** When responding, please cite specific parts of the document (e.g., "According to the document..." or "As stated in the section on...") to show which parts support your answer.`;
  } catch (s3Error: any) {
    console.error('[fetchDocumentContentFromS3] Error downloading markdown from S3:', s3Error.message);
    return undefined;
  }
}

/**
 * Fetch document content from DocumentSummary
 */
export async function fetchDocumentContentFromSummary(
  client: ReturnType<typeof generateClient<Schema>>,
  documentUuid: string
): Promise<string | undefined> {
  try {
    const summaries = await client.models.DocumentSummary.listDocumentSummaryByDocumentUuid({
      documentUuid,
    }, {
      selectionSet: ['summary'],
    });
    
    const summary = summaries.data[0];
    if (!summary?.summary) {
      return undefined;
    }
    
    return `## Document Summary\n\n` +
      `Here is a summary of the document content:\n\n` +
      summary.summary +
      `\n\n---\n\n` +
      `**Important:** When responding, please reference specific parts of the summary (e.g., "According to the summary..." or "As mentioned in the document summary...") to show which parts support your answer.`;
  } catch (dbError) {
    console.error('[fetchDocumentContentFromSummary] Error fetching summary from DocumentSummary:', dbError);
    return undefined;
  }
}

/** Number of RAG hits to retrieve for space-scoped content (flashcards, chat summaries) */
const SPACE_RAG_HITS = 5;

/**
 * Fetch flashcard content from RAG for a space.
 * Returns formatted string or undefined if no hits.
 */
export async function fetchFlashcardContentFromRag(
  userUuid: string,
  spaceUuid: string,
  userMessage: string
): Promise<string | undefined> {
  const ragIsEnabled = process.env.RAG_ENABLED === "true";
  if (!ragIsEnabled) return undefined;

  try {
    const { hits } = await queryRagBySpace(
      userMessage,
      userUuid,
      spaceUuid,
      "flashcard",
      SPACE_RAG_HITS
    );
    if (!hits.length) return undefined;

    const formatted = hits.map((h) => h.chunkText.trim()).join("\n\n---\n\n");
    return (
      `## Flashcards in this space\n\n` +
      `Relevant flashcards that may help answer the query:\n\n` +
      formatted +
      `\n\n---\n\n` +
      `**Note:** Use flashcard content above to supplement your answers when relevant.`
    );
  } catch (err) {
    console.error('[fetchFlashcardContentFromRag] failed:', err);
    return undefined;
  }
}

/**
 * Fetch chat summary content from RAG for a space.
 * Returns formatted string or undefined if no hits.
 */
export async function fetchChatSummaryContentFromRag(
  userUuid: string,
  spaceUuid: string,
  userMessage: string
): Promise<string | undefined> {
  const ragIsEnabled = process.env.RAG_ENABLED === "true";
  if (!ragIsEnabled) return undefined;

  try {
    const { hits } = await queryRagBySpace(
      userMessage,
      userUuid,
      spaceUuid,
      "chat_summary",
      SPACE_RAG_HITS
    );
    if (!hits.length) return undefined;

    const formatted = hits.map((h) => h.chunkText.trim()).join("\n\n---\n\n");
    return (
      `## Prior chat summaries in this space\n\n` +
      `Summaries from earlier conversations that may be relevant:\n\n` +
      formatted +
      `\n\n---\n\n` +
      `**Note:** Use this context from past chats when it helps answer the query.`
    );
  } catch (err) {
    console.error('[fetchChatSummaryContentFromRag] failed:', err);
    return undefined;
  }
}

/**
 * Common function to fetch and format document content
 * Priority: 1) RAG if embeddings exist, 2) S3 markdown, 3) DocumentSummary
 * @param client - Amplify client
 * @param documentUuids - Array of document UUIDs to search
 * @param userUuid - User UUID
 * @param userMessage - User's message (for RAG query)
 * @returns Formatted document markdown string or undefined
 */
export async function fetchDocumentContent(
  client: ReturnType<typeof generateClient<Schema>>,
  documentUuids: string[],
  userUuid: string,
  userMessage?: string
): Promise<string | undefined> {
  if (documentUuids.length === 0) {
    return undefined;
  }
  
  const isMultipleDocuments = documentUuids.length > 1;
  const ragIsEnabled = process.env.RAG_ENABLED === 'true';
  
  // Try RAG search first if we have a user message
  if (userMessage && ragIsEnabled) {
    const ragContent = await fetchDocumentContentFromRag(
      client, 
      userMessage, 
      userUuid, 
      documentUuids,
    );
    if (ragContent) {
      return ragContent;
    }
  }
  
  // Fall back to S3 markdown or summary (only for single document)
  if (documentUuids.length === 1) {
    const documentUuid = documentUuids[0];
    const s3Content = await fetchDocumentContentFromS3(documentUuid, userUuid);
    if (s3Content) {
      return s3Content;
    }
    
    const summaryContent = await fetchDocumentContentFromSummary(client, documentUuid);
    return summaryContent;
  }
  
  return undefined;
}

