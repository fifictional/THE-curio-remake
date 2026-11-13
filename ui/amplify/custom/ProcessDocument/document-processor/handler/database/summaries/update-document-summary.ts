import fetch from 'node-fetch';
import { Schema } from '../../../../../../data/resource';

const APPSYNC_URL = process.env.APPSYNC_URL!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

const APPSYNC_MUTATION = `
  mutation UpdateDocumentSummary($input: UpdateDocumentSummaryInput!) {
    updateDocumentSummary(input: $input) {
      documentSummaryUuid
      documentUuid
      title
      summary
      tags
      keyConcepts
      markdown
      enrichedMarkdown
    }
  }
`;

export const updateDocumentSummary = async (summary: Schema['DocumentSummary']['updateType']) => {
  const mutationVariables = {
    input: {
      documentSummaryUuid: summary.documentSummaryUuid,
      documentUuid: summary.documentUuid,
      title: summary.title,
      summary: summary.summary,
      tags: summary.tags,
      keyConcepts: summary.keyConcepts,
      markdown: summary.markdown,
      enrichedMarkdown: summary.enrichedMarkdown,
    },
  };

  console.log('Sending to AppSync:', JSON.stringify(mutationVariables, null, 2));

  const response = await fetch(APPSYNC_URL, {
    method: "POST",
    headers: {
      "x-api-key": APPSYNC_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: APPSYNC_MUTATION,
      variables: mutationVariables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AppSync mutation failed: ${response.status} - ${text}`);
  }

  const data = await response.json() as { data?: { updateDocumentSummary: any }, errors?: any[] };
  console.log('AppSync response:', data);
  
  if (data.errors) {
    throw new Error(`AppSync errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}
