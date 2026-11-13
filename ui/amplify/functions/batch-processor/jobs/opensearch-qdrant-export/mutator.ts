import { registerMutator } from '../../../../common/batch-processing';
import { getOpensearchClient } from '../../../../utils/opensearch-lazy-client';
import { exportOpenSearchSlice } from '../../../../utils/vector-store/opensearch-export';
import { QdrantVectorStore } from '../../../../utils/vector-store/qdrant-store';
import { JOB_NAME, OpenSearchQdrantExportJob } from './interface';

const QDRANT_BATCH_SIZE = 100;
const QDRANT_UPSERT_MAX_ATTEMPTS = 3;

async function upsertBatchWithRetry(
  qdrant: QdrantVectorStore,
  chunk: Parameters<QdrantVectorStore['upsertMany']>[0],
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= QDRANT_UPSERT_MAX_ATTEMPTS; attempt++) {
    try {
      await qdrant.upsertMany(chunk);
      return;
    } catch (err) {
      lastError = err;
      console.warn(
        `[opensearch-qdrant-export] Qdrant upsert attempt ${attempt}/${QDRANT_UPSERT_MAX_ATTEMPTS} failed:`,
        err,
      );
      if (attempt < QDRANT_UPSERT_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: OpenSearchQdrantExportJob, log) => {
    const { sliceId, maxSlices } = job;
    log(`Exporting OpenSearch slice ${sliceId + 1}/${maxSlices} to Qdrant`);

    const opensearch = getOpensearchClient();
    const qdrant = new QdrantVectorStore();

    const result = await exportOpenSearchSlice(
      opensearch,
      sliceId,
      maxSlices,
      async (points) => {
        if (points.length > 0) {
          const dims = points[0].vector.length;
          await qdrant.ensureCollection(dims);
        }

        for (let i = 0; i < points.length; i += QDRANT_BATCH_SIZE) {
          const chunk = points.slice(i, i + QDRANT_BATCH_SIZE);
          try {
            await upsertBatchWithRetry(qdrant, chunk);
          } catch (batchErr) {
            // Fall back to per-point upserts so one bad payload doesn't fail the slice.
            log(
              `Batch upsert failed (${chunk.length} points); retrying per-point: ${String(batchErr)}`,
            );
            for (const point of chunk) {
              try {
                await upsertBatchWithRetry(qdrant, [point]);
              } catch (pointErr) {
                log(`Skipping point ${point.id}: ${String(pointErr)}`);
              }
            }
          }
        }
      },
    );

    log(
      `Slice ${sliceId} complete: exported=${result.exported}, skipped=${result.skipped}`,
    );
  },
});
