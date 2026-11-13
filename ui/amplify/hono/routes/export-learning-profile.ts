/**
 * `exportLearningProfile` mutation route — P2-5.
 *
 * Source: `amplify/functions/memory-export-pdf/handler.ts` (90 LOC).
 *
 * Migration parity:
 *   - Reads `UserProfile`, `Chat` (paginated by `userUuid+createdAt`), and
 *     `MemoryService.listBlocksForOwner` for both `KNOWLEDGE_GAP` and
 *     `MASTERED_TOPIC` block types (limit 200 each).
 *   - Builds the PDF via `buildLearningProfilePdf` from `@ai-memory/index`.
 *   - Uploads to S3 at `exports/memory/<userUuid>/<filename>` using the
 *     `AI_TUTOR_STORAGE_BUCKET_NAME` env var (auto-injected by Amplify when
 *     `allow.resource(honoLight)` is granted on the storage path — wired in
 *     `amplify/storage/resource.ts`).
 *   - Returns `{success:true, downloadUrl, filename}` where `downloadUrl` is a
 *     1-hour presigned GET URL.
 *
 * Bucket env fallback (`AI_TUTOR_STORAGE_BUCKET_NAME || AWS_BUCKET_NAME`)
 * preserved from the original. If neither is set we throw 'Storage bucket not
 * configured' (same message).
 *
 * AppSync field shape (from `amplify/data/resource.ts:1485-1497`):
 *
 *   exportLearningProfile(userUuid: ID!): {
 *     success: Boolean!, downloadUrl: String, filename: String, error: String
 *   }
 *
 * Required IAM (wired in `amplify/storage/resource.ts`):
 *
 *   'exports/memory/*': [allow.resource(honoLight).to(['read', 'write'])]
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-5.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MemoryService,
  buildLearningProfilePdf,
  learningProfileFilename,
  BLOCK_TYPE_KNOWLEDGE_GAP,
  BLOCK_TYPE_MASTERED_TOPIC,
} from '@ai-memory/index';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const ExportLearningProfileArgs = z.object({
  userUuid: z.string().min(1, 'userUuid is required'),
});

export interface ExportLearningProfileRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface ExportLearningProfileDeps {
  s3?: S3Client;
  // Override for tests; production reads from `process.env` at request time.
  bucketName?: () => string | undefined;
  // Override for tests; production uses `@aws-sdk/s3-request-presigner.getSignedUrl`.
  signGetUrl?: (s3: S3Client, command: GetObjectCommand) => Promise<string>;
}

export function createExportLearningProfileRoute(
  client: HonoDataClient,
  deps: ExportLearningProfileDeps = {},
): ExportLearningProfileRoute {
  const validate = validateBody(ExportLearningProfileArgs);
  const s3 = deps.s3 ?? new S3Client({});
  const signGetUrl =
    deps.signGetUrl ??
    ((client_, command) => getSignedUrl(client_, command, { expiresIn: 3600 }));

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid } = getValidatedBody<typeof ExportLearningProfileArgs>(c);
    const memory = new MemoryService(client);

    const profile = await client.models.UserProfile.get({ userUuid });
    const gaps = await memory.listBlocksForOwner(
      userUuid,
      BLOCK_TYPE_KNOWLEDGE_GAP,
      200,
    );
    const mastered = await memory.listBlocksForOwner(
      userUuid,
      BLOCK_TYPE_MASTERED_TOPIC,
      200,
    );

    const chats = await client.models.Chat.listChatByUserUuidAndCreatedAt(
      { userUuid },
      { limit: 500 },
    );
    const sessionCount = chats.data?.length ?? 0;

    const pdfBytes = await buildLearningProfilePdf({
      ownerName: profile.data?.firstName ?? undefined,
      education: profile.data?.lifestage?.replace(/-/g, ' ') ?? undefined,
      academicYear: profile.data?.academicYear ?? undefined,
      major: profile.data?.course ?? undefined,
      goal: profile.data?.userHelp ?? undefined,
      interests: profile.data?.userTopics
        ? profile.data.userTopics
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : (profile.data?.intents?.filter((s): s is string => Boolean(s)) ??
          undefined),
      gaps,
      mastered,
      sessionCount,
    });

    const bucketResolver =
      deps.bucketName ??
      (() =>
        process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
        process.env.AWS_BUCKET_NAME ||
        '');
    const bucket = bucketResolver();
    if (!bucket) {
      throw new Error('Storage bucket not configured');
    }

    const filename = learningProfileFilename();
    const key = `exports/memory/${userUuid}/${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdfBytes,
        ContentType: 'application/pdf',
      }),
    );

    const downloadUrl = await signGetUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    return c.json({ success: true, downloadUrl, filename });
  };

  return { validate, handler };
}
