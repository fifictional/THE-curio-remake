import fetch from 'node-fetch';

const APPSYNC_URL = process.env.APPSYNC_URL!;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY!;

const APPSYNC_MUTATION = `  
    mutation CreateDocumentVisionOutput($input: CreateDocumentVisionOutputInput!) {
        createDocumentVisionOutput(input: $input) {
            documentUuid
            documentVisionOutputUuid
            totalPages
            pageNumber
            bbox
            className
            confidence
            text
            caption
        }
    }
`;

export interface VisionOutputItem {
  documentVisionOutputUuid: string;
  documentUuid: string;
  totalPages: number;
  pageNumber: number;
  className: string;
  confidence: number;
  bbox: string;
  text?: string;
  caption?: string;
}

// Push layout items to AppSync in parallel with concurrency limit
export async function pushLayoutItem(layoutItem: VisionOutputItem) {
  const res = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': APPSYNC_API_KEY,
    },
    body: JSON.stringify({
      query: APPSYNC_MUTATION,
      variables: { input: layoutItem },
    }),
  });

  const json = await res.json() as { errors?: any[] };
  if (!res.ok || json.errors) {
    console.error('AppSync error:', json.errors);
    throw new Error(`Failed to push layout block with ID ${layoutItem.documentVisionOutputUuid}`);
  }
}

export async function runWithConcurrencyLimit(tasks: (() => Promise<void>)[], limit: number) {
  const results: Promise<void>[] = [];
  let i = 0;

  async function next() {
    if (i === tasks.length) return;
    const taskIndex = i++;
    await tasks[taskIndex]();
    await next();
  }

  for (let j = 0; j < limit; j++) {
    results.push(next());
  }

  await Promise.all(results);
}

// Save multiple vision outputs with concurrency control
export async function saveVisionOutputs(visionItems: VisionOutputItem[]) {
  const concurrencyLimit = 5;
  const pushTasks = visionItems.map(item => () => pushLayoutItem(item));
  await runWithConcurrencyLimit(pushTasks, concurrencyLimit);
}