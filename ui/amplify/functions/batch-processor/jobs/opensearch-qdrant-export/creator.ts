import { registerCreator } from '../../../../common/batch-processing';
import { getOpensearchClient } from '../../../../utils/opensearch-lazy-client';
import {
  computeExportSliceCount,
  countOpenSearchDocuments,
} from '../../../../utils/vector-store/opensearch-export';
import { isOpensearchConfigured } from '../../../../utils/opensearch-lazy-client';
import { isQdrantConfigured } from '../../../../utils/qdrant-secrets';
import { JOB_NAME, OpenSearchQdrantExportJob } from './interface';

registerCreator({
  name: 'OpenSearch → Qdrant Export',
  jobType: JOB_NAME,
  description:
    'Export all vectors from OpenSearch to self-hosted Qdrant using parallel sliced scroll',
  createJobs: async (emit, log) => {
    if (!isOpensearchConfigured()) {
      throw new Error('OpenSearch is not configured — cannot export');
    }
    if (!isQdrantConfigured()) {
      throw new Error(
        'Qdrant is not configured — set QDRANT_URL or QDRANT_SECRET_NAME',
      );
    }

    const client = getOpensearchClient();
    const totalDocuments = await countOpenSearchDocuments(client);
    const maxSlices = computeExportSliceCount(totalDocuments);

    log(
      `OpenSearch index has ${totalDocuments} documents — emitting ${maxSlices} slice jobs`,
    );

    for (let sliceId = 0; sliceId < maxSlices; sliceId++) {
      await emit({ sliceId, maxSlices } satisfies OpenSearchQdrantExportJob);
    }

    log(`Queued ${maxSlices} export slices`);
  },
});
