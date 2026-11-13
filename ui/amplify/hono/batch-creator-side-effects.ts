/**
 * Side-effect imports that register batch job creators in the global registry.
 *
 * MUST be imported at module top-level in Hono-Heavy (before the Hono app is
 * created) per §6.5 #10 / P3-9.
 */
import '../functions/batch-processor/jobs/flashcard-migration/creator';
import '../functions/batch-processor/jobs/rag-embeddings-sync/creator';
import '../functions/batch-processor/jobs/test-delayed-logger/creator';
import '../functions/batch-processor/jobs/test-flashcard-deck-logger/creator';
import '../functions/batch-processor/jobs/subscription-tier-default/creator';
import '../functions/batch-processor/jobs/categorise-document/creator';
import '../functions/batch-processor/jobs/populate-user-profile/creator';
import '../functions/batch-processor/jobs/space-flashcard-embed/creator';
import '../functions/batch-processor/jobs/chat-summary-embed/creator';
import '../functions/batch-processor/jobs/memory-consolidation/creator';
import '../functions/batch-processor/jobs/chat-memory-backfill/creator';
import '../functions/batch-processor/jobs/opensearch-qdrant-export/creator';
