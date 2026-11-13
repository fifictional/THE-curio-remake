import { queryRag } from "../../utils/opensearchClient";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

/**
 * Build user-scoped OpenSearch kNN query (HNSW + cosine)
 */
function buildUserScopedQuery(userSub: string, queryEmbedding: number[], k = 5) {
  return {
    size: k,
    query: {
      bool: {
        must: [
          { term: { user_id: userSub } },
          {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k,
              },
            },
          },
        ],
      },
    },
    _source: ["chunk_text", "doc_key"],
  };
}

const queryRagHandler = async (event: any) => {
  const q = event?.arguments?.query;
  const userSub = event.arguments?.userUuid;
  const docId = event.arguments?.docId;

  if (!q) return { status: false, body: "Missing query param q" };
  if (!userSub) return { status: false, body: "Unauthorized" };

  // Convert single docId to array format
  const docIds = docId ? [docId] : [];

  return {
    status: true,
    body: JSON.stringify(await queryRag(q, userSub, docIds))
  }
};

export const handler = withSentryLambdaHandler(queryRagHandler);
