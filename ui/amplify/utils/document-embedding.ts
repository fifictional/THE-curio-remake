import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "./textUtils";
import { getWriteVectorStore, type RagSourceType, type VectorPoint } from "./vector-store";
import type { Client } from "@opensearch-project/opensearch";
import { getOpensearchClient } from "./opensearch-lazy-client";

const bedrock = new BedrockRuntimeClient({});

/**
 * Ensure vector collection exists with correct dimensions.
 * @deprecated Prefer getWriteVectorStore().ensureCollection() — kept for callers passing OpenSearch Client.
 */
export async function ensureIndexWithDims(
  _client: Client,
  _indexName: string,
  dims: number
) {
  if (!process.env.OPENSEARCH_ENDPOINT && !process.env.QDRANT_URL) return;
  try {
    await getWriteVectorStore().ensureCollection(dims);
  } catch (err: unknown) {
    console.error("Failed to ensure vector collection:", err);
    throw err;
  }
}

async function upsertChunk(
  userUuid: string,
  chunkId: string,
  documentUuid: string,
  chunkTextValue: string,
  embedding: number[],
  extra?: Partial<VectorPoint['payload']>,
): Promise<void> {
  const store = getWriteVectorStore();
  await store.ensureCollection(embedding.length);
  await store.upsert({
    id: chunkId,
    vector: embedding,
    payload: {
      userUuid,
      chunkId,
      documentUuid,
      chunkText: chunkTextValue,
      createdAt: new Date().toISOString(),
      ...extra,
    },
  });
}

/**
 * Embed a document's markdown content into the vector store.
 */
export async function embedDocumentContent(
  documentUuid: string,
  userUuid: string,
  markdown: string
): Promise<void> {
  const chunks = chunkText(markdown ?? '', 1000);

  for (const chunk of chunks) {
    const embedResp = await bedrock.send(
      new InvokeModelCommand({
        modelId: "amazon.titan-embed-text-v2:0",
        body: JSON.stringify({ inputText: chunk }),
      })
    );

    const responseStr = new TextDecoder().decode(embedResp.body);
    const embedding = JSON.parse(responseStr).embedding as number[];

    await upsertChunk(userUuid, uuidv4(), documentUuid, chunk, embedding);
  }
}

export type { RagSourceType };

/**
 * Embed flashcard content for space RAG.
 */
export async function embedFlashcardContent(
  userUuid: string,
  spaceUuid: string,
  flashcards: Array<{ title: string; content: string; documentUuid?: string }>
): Promise<void> {
  const { deleteSpaceChunks } = await import('./opensearchClient');

  if (flashcards.length === 0) {
    await deleteSpaceChunks(userUuid, spaceUuid, "flashcard");
    return;
  }

  await deleteSpaceChunks(userUuid, spaceUuid, "flashcard");

  const chunks = flashcards.map((fc) =>
    `Front: ${fc.title}\n\nBack: ${fc.content}`.trim()
  );

  const BATCH_SIZE = 10;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchFlashcards = flashcards.slice(i, i + BATCH_SIZE);
    const embedPromises = batch.map((chunk) =>
      bedrock.send(
        new InvokeModelCommand({
          modelId: "amazon.titan-embed-text-v2:0",
          body: JSON.stringify({ inputText: chunk }),
        })
      )
    );
    const embedResponses = await Promise.all(embedPromises);

    for (let j = 0; j < batch.length; j++) {
      const responseStr = new TextDecoder().decode(embedResponses[j].body);
      const embedding = JSON.parse(responseStr).embedding as number[];

      await upsertChunk(
        userUuid,
        uuidv4(),
        batchFlashcards[j]?.documentUuid ?? "",
        batch[j],
        embedding,
        {
          sourceType: "flashcard",
          spaceUuid,
        },
      );
    }
  }
}

/**
 * Embed chat summary text for space RAG.
 */
export async function embedChatSummaryContent(
  userUuid: string,
  spaceUuid: string,
  summaryText: string,
  documentUuid: string = ""
): Promise<void> {
  const chunks = chunkText(summaryText ?? "", 1000);
  if (chunks.length === 0) return;

  for (const chunk of chunks) {
    const embedResp = await bedrock.send(
      new InvokeModelCommand({
        modelId: "amazon.titan-embed-text-v2:0",
        body: JSON.stringify({ inputText: chunk }),
      })
    );
    const responseStr = new TextDecoder().decode(embedResp.body);
    const embedding = JSON.parse(responseStr).embedding as number[];

    await upsertChunk(userUuid, uuidv4(), documentUuid, chunk, embedding, {
      sourceType: "chat_summary",
      spaceUuid,
    });
  }
}

/** @deprecated Only used by legacy memory vector-store import path. */
export { getOpensearchClient };
