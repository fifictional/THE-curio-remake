import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const APPSYNC_URL = process.env.APPSYNC_URL!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

const APPSYNC_MUTATION = `
  mutation CreateDocumentSection($input: CreateDocumentSectionInput!) {
    createDocumentSection(input: $input) {
      documentSectionUuid
      documentUuid
      documentType
      subject
      sectionName
      pageRange
      sectionSummary
      sectionKeyConcepts
      sectionContent {
        documentContentBlockUuid
        bbox
        content_type
        page_number
        content_text
        visual_element_type
        visual_element_name
        visual_element_description
        visual_element_caption
      }
    }
  }
`;

interface AppSyncResponse {
  data?: {
    createDocumentSection: any;
  };
  errors?: any[];
}

export interface DocumentContentBlock {
  documentContentBlockUuid: string;
  bbox: number[];
  content_type: string;
  page_number: number;
  content_text?: string;
  visual_element_type?: string;
  visual_element_name?: string;
  visual_element_description?: string;
  visual_element_caption?: string;
}

export interface ExtractedContentItem {
  documentUuid: string;
  documentType: string;
  subject: string;
  sectionName: string;
  pageRange: string;
  sectionSummary: string;
  sectionKeyConcepts: string[];
  sectionContent: DocumentContentBlock[];
}

// Helper: call AppSync mutation to save extracted content
export async function saveExtractedContentToAppSync(item: ExtractedContentItem) {
  const mutationVariables = {
    input: {
      documentUuid: item.documentUuid,
      documentSectionUuid: uuidv4(),
      documentType: item.documentType,
      subject: item.subject,
      sectionName: item.sectionName,
      pageRange: item.pageRange,
      sectionSummary: item.sectionSummary,
      sectionKeyConcepts: item.sectionKeyConcepts,
      sectionContent: item.sectionContent.map(block => ({
        documentContentBlockUuid: block.documentContentBlockUuid, // Use the existing UUID
        bbox: block.bbox,
        content_type: block.content_type,
        page_number: block.page_number,
        content_text: block.content_text,
        visual_element_type: block.visual_element_type,
        visual_element_name: block.visual_element_name,
        visual_element_description: block.visual_element_description,
        visual_element_caption: block.visual_element_caption,
      })),
    },
  };
  
  console.log('Sending to AppSync:', JSON.stringify(mutationVariables, null, 2));
  
  const res = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({
      query: APPSYNC_MUTATION,
      variables: mutationVariables,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AppSync mutation failed: ${res.status} - ${text}`);
  }

  const data = await res.json() as AppSyncResponse;
  if (data.errors) {
    throw new Error(`AppSync errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data?.createDocumentSection;
}

// Save multiple extracted content sections
export async function saveExtractedContentSections(
  documentUuid: string, 
  parsedContent: any
) {
  for (const section of parsedContent.sections) {
    // Transform content_blocks to match DocumentContentBlock interface
    const contentBlocks: DocumentContentBlock[] = section.content_blocks.map((block: any) => ({
      documentContentBlockUuid: block.documentContentBlockUuid,
      bbox: block.bbox || [],
      content_type: block.content_type || 'text',
      page_number: block.page_number || 1,
      content_text: block.content_text,
      visual_element_type: block.visual_element_type,
      visual_element_name: block.visual_element_name,
      visual_element_description: block.visual_element_description,
      visual_element_caption: block.visual_element_caption,
    }));

    await saveExtractedContentToAppSync({
      documentUuid,
      documentType: parsedContent.document_type,
      subject: parsedContent.subject,
      sectionName: section.section_name,
      pageRange: section.page_range,
      sectionSummary: section.section_summary,
      sectionKeyConcepts: section.section_key_concepts,
      sectionContent: contentBlocks,
    });
  }
}