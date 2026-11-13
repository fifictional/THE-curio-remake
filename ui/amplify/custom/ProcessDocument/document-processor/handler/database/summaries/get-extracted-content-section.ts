import fetch from 'node-fetch';
import { GetDocumentSectionResponse } from '../../core/types';

const query = `
  query ListDocumentSections($documentUuid: ID!) {
    listDocumentSections(filter: { documentUuid: { eq: $documentUuid } }) {
      items {
        documentSectionUuid
        documentUuid
        documentType
        subject
        sectionName
        pageRange
        pageNumber
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
  }
`;

export const getDocumentExtractedContentSection = async (documentUuid: string) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: query,
      variables: {
        documentUuid: documentUuid
      },
    }),
  });

  const data = await response.json() as { data?: { listDocumentSections: { items: GetDocumentSectionResponse[] } } }
  console.log('GraphQL Response Data:', JSON.stringify(data, null, 2));
  
  const items = data.data?.listDocumentSections.items;
  console.log('Extracted Items:', JSON.stringify(items, null, 2));
  
  return items;
};