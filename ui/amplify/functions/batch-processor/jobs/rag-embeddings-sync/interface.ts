/**
 * RAG Embeddings Sync Job
 * 
 * Creator: Queues every Document UUID for RAG embeddings sync
 * Mutator: Processes each document by:
 *   - Checking if document has embeddings using hasEmbeddingsForDocument
 *   - If no embeddings:
 *     - Check if MD file exists on S3
 *     - If MD file exists: embed it
 *     - If no MD file: mark hasRagEmbeddings as false
 */

export const JOB_NAME = "rag-embeddings-sync";

export type RagEmbeddingsSyncJob = {
  documentUuid: string;
};

