import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  getReadVectorStore,
  getWriteVectorStore,
  isVectorStoreConfigured,
  type RagSourceType,
} from './vector-store';
import { getOpensearchClient, resetOpensearchClientForTests } from './opensearch-lazy-client';

export type { RagSourceType };

const bedrock = new BedrockRuntimeClient({});

/** @deprecated Use getOpensearchClient() from opensearch-lazy-client */
export const opensearchClient = {
  search: (...args: Parameters<ReturnType<typeof getOpensearchClient>['search']>) =>
    getOpensearchClient().search(...args),
  index: (...args: Parameters<ReturnType<typeof getOpensearchClient>['index']>) =>
    getOpensearchClient().index(...args),
  delete: (...args: Parameters<ReturnType<typeof getOpensearchClient>['delete']>) =>
    getOpensearchClient().delete(...args),
  deleteByQuery: (
    ...args: Parameters<ReturnType<typeof getOpensearchClient>['deleteByQuery']>
  ) => getOpensearchClient().deleteByQuery(...args),
  indices: {
    exists: (...args: Parameters<ReturnType<typeof getOpensearchClient>['indices']['exists']>) =>
      getOpensearchClient().indices.exists(...args),
    create: (...args: Parameters<ReturnType<typeof getOpensearchClient>['indices']['create']>) =>
      getOpensearchClient().indices.create(...args),
  },
};

export { getOpensearchClient, resetOpensearchClientForTests };
export { isOpensearchConfigured } from './opensearch-lazy-client';

export async function deleteFromIndex({
  index,
  id,
}: {
  index: string;
  id: string;
}) {
  return getOpensearchClient().delete({ index, id });
}

export async function hasEmbeddingsForDocument(
  userUuid: string,
  documentUuid: string,
): Promise<boolean> {
  if (!isVectorStoreConfigured()) return false;

  try {
    const store = getReadVectorStore();
    const count = await store.countByFilter({ userUuid, documentUuid });
    return count > 0;
  } catch (err: unknown) {
    console.error('❌ Error checking embeddings:', err);
    return false;
  }
}

export async function deleteSpaceChunks(
  userUuid: string,
  spaceUuid: string,
  sourceType: RagSourceType,
): Promise<{ deleted: number }> {
  if (!isVectorStoreConfigured()) return { deleted: 0 };

  try {
    const store = getWriteVectorStore();
    const deleted = await store.deleteByFilter({
      userUuid,
      spaceUuid,
      sourceType,
    });
    return { deleted };
  } catch (err: unknown) {
    console.error('❌ deleteSpaceChunks error:', err);
    return { deleted: 0 };
  }
}

export async function queryRag(
  q: string,
  userUuid: string,
  docIds: string[],
  k: number = 5,
) {
  if (!isVectorStoreConfigured()) {
    return { answer: '', hits: [] };
  }

  try {
    const embedResp = await bedrock.send(
      new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v2:0',
        body: JSON.stringify({ inputText: q }),
      }),
    );

    const embeddingStr = new TextDecoder().decode(embedResp.body);
    const embedding = JSON.parse(embeddingStr).embedding as number[];

    const store = getReadVectorStore();
    const hitsArray = await store.search(
      embedding,
      { userUuid, documentUuid: docIds },
      k,
    );

    const hits = hitsArray
      .map((hit) => ({
        chunkText: hit.payload.chunkText || '',
        documentUuid: hit.payload.documentUuid || '',
      }))
      .filter((hit) => hit.chunkText);

    return {
      answer: 'Disabled answer using hits only.',
      hits,
    };
  } catch (err: unknown) {
    console.error('❌ queryRagLambda error:', err);
    return { answer: '', hits: [] };
  }
}

export async function queryRagBySpace(
  q: string,
  userUuid: string,
  spaceUuid: string,
  sourceType: RagSourceType,
  k: number = 5,
): Promise<{ hits: Array<{ chunkText: string }> }> {
  if (!isVectorStoreConfigured()) {
    return { hits: [] };
  }

  try {
    const embedResp = await bedrock.send(
      new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v2:0',
        body: JSON.stringify({ inputText: q }),
      }),
    );
    const embeddingStr = new TextDecoder().decode(embedResp.body);
    const embedding = JSON.parse(embeddingStr).embedding as number[];

    const store = getReadVectorStore();
    const hitsArray = await store.search(
      embedding,
      { userUuid, spaceUuid, sourceType },
      k,
    );

    const hits = hitsArray
      .map((hit) => ({
        chunkText: hit.payload.chunkText || '',
      }))
      .filter((hit) => hit.chunkText);

    return { hits };
  } catch (err: unknown) {
    console.error('❌ queryRagBySpace error:', err);
    return { hits: [] };
  }
}

export { getOpenSearchIndexName } from './vector-store';
