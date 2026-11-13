/**
 * `deleteDocument` query route — P3-4.
 *
 * Source: `amplify/functions/delete-document/handler.ts`
 * Core logic: `run-delete-document.ts`.
 *
 * Note: PF-11 tracks existing 46.5% error rate on this op — migration preserves
 * current behaviour (including commented-out `deleteFromIndex` in
 * `common/delete-document.ts`); OpenSearch fix is a separate decision.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-4.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { S3Client } from '@aws-sdk/client-s3';

import { runDeleteDocument } from '../../functions/delete-document/run-delete-document';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const DeleteDocumentArgs = z.object({
  documentUuid: z.string().min(1, 'documentUuid is required'),
});

export interface DeleteDocumentRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createDeleteDocumentRoute(
  client: HonoDataClient,
  deps: { s3?: S3Client; bucketName?: () => string; openSearchIndex?: () => string } = {},
): DeleteDocumentRoute {
  const validate = validateBody(DeleteDocumentArgs);
  const s3 = deps.s3 ?? new S3Client({});
  const bucketName =
    deps.bucketName ??
    (() =>
      process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
      process.env.AWS_BUCKET_NAME ||
      '');
  const openSearchIndex =
    deps.openSearchIndex ?? (() => process.env.OPENSEARCH_INDEX || '');

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { documentUuid } = getValidatedBody<typeof DeleteDocumentArgs>(c);
    const result = await runDeleteDocument(client, documentUuid, {
      s3,
      bucketName: bucketName(),
      openSearchIndex: openSearchIndex(),
    });
    return c.json(result);
  };

  return { validate, handler };
}
