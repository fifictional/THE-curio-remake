/**
 * Unit tests for the `exportLearningProfile` route (P2-5).
 *
 * Mocks `@ai-memory/index` (MemoryService, buildLearningProfilePdf,
 * learningProfileFilename, BLOCK_TYPE_* constants) and injects a fake S3 +
 * presigner so we don't hit AWS. Verifies:
 *   - happy path (S3 PutObject called with the correct key/body, presigned URL returned)
 *   - bucket-not-configured error
 *   - validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import {
  PutObjectCommand,
  GetObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';

const {
  listBlocksForOwnerMock,
  buildLearningProfilePdfMock,
  learningProfileFilenameMock,
  MemoryServiceMock,
} = vi.hoisted(() => {
  const listBlocksForOwnerMock = vi.fn<
    (ownerUuid: string, blockType: string, limit: number) => Promise<unknown[]>
  >();
  const buildLearningProfilePdfMock = vi
    .fn<(arg: unknown) => Promise<Uint8Array>>()
    .mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // "%PDF"
  const learningProfileFilenameMock = vi.fn<() => string>().mockReturnValue('profile-test.pdf');
  const MemoryServiceMock = vi.fn().mockImplementation(() => ({
    listBlocksForOwner: listBlocksForOwnerMock,
  }));
  return {
    listBlocksForOwnerMock,
    buildLearningProfilePdfMock,
    learningProfileFilenameMock,
    MemoryServiceMock,
  };
});

vi.mock('@ai-memory/index', () => ({
  MemoryService: MemoryServiceMock,
  buildLearningProfilePdf: buildLearningProfilePdfMock,
  learningProfileFilename: learningProfileFilenameMock,
  BLOCK_TYPE_KNOWLEDGE_GAP: 'KNOWLEDGE_GAP',
  BLOCK_TYPE_MASTERED_TOPIC: 'MASTERED_TOPIC',
}));

import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createExportLearningProfileRoute } from '../routes/export-learning-profile';
import type { HonoDataClient } from '../shared/data-client';

function buildClient(): HonoDataClient {
  return {
    models: {
      UserProfile: {
        get: vi.fn().mockResolvedValue({
          data: {
            firstName: 'Test',
            lifestage: 'university-student',
            academicYear: '3',
            course: 'CS',
            userHelp: 'pass exam',
            userTopics: 'ML, Algorithms',
            intents: null,
          },
        }),
      },
      Chat: {
        listChatByUserUuidAndCreatedAt: vi.fn().mockResolvedValue({
          data: [{ chatUuid: 'c1' }, { chatUuid: 'c2' }, { chatUuid: 'c3' }],
        }),
      },
    },
  } as unknown as HonoDataClient;
}

function buildS3() {
  const sendMock = vi.fn().mockResolvedValue({});
  return {
    s3: { send: sendMock } as unknown as S3Client,
    sendMock,
  };
}

function buildApp(deps: {
  client: HonoDataClient;
  s3: S3Client;
  bucketName?: () => string | undefined;
  signGetUrl?: (s3: S3Client, command: GetObjectCommand) => Promise<string>;
}) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createExportLearningProfileRoute(deps.client, {
    s3: deps.s3,
    bucketName: deps.bucketName ?? (() => 'test-bucket'),
    signGetUrl:
      deps.signGetUrl ?? (() => Promise.resolve('https://signed.example/profile-test.pdf')),
  });
  app.post(
    '/exportLearningProfile',
    route.validate,
    route.handler,
  );
  return app;
}

beforeEach(() => {
  listBlocksForOwnerMock.mockReset();
  buildLearningProfilePdfMock.mockClear();
  learningProfileFilenameMock.mockClear();
});

describe('exportLearningProfile route (P2-5)', () => {
  it('happy path — uploads PDF to S3 and returns presigned URL', async () => {
    listBlocksForOwnerMock.mockResolvedValueOnce([{ id: 'g1' }]); // gaps
    listBlocksForOwnerMock.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }]); // mastered

    const { s3, sendMock } = buildS3();
    const adapter = directInvokeAdapter(
      buildApp({ client: buildClient(), s3 }),
    );

    const event = buildDirectInvokeEvent('exportLearningProfile', {
      userUuid: 'user-1',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      downloadUrl: string;
      filename: string;
    };

    expect(result.success).toBe(true);
    expect(result.filename).toBe('profile-test.pdf');
    expect(result.downloadUrl).toBe('https://signed.example/profile-test.pdf');

    // S3 was called once with PutObject at the right key
    expect(sendMock).toHaveBeenCalledOnce();
    const put = sendMock.mock.calls[0][0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input.Bucket).toBe('test-bucket');
    expect(put.input.Key).toBe('exports/memory/user-1/profile-test.pdf');
    expect(put.input.ContentType).toBe('application/pdf');

    // Both block lookups happened (gaps + mastered)
    expect(listBlocksForOwnerMock).toHaveBeenCalledTimes(2);
    expect(listBlocksForOwnerMock).toHaveBeenNthCalledWith(1, 'user-1', 'KNOWLEDGE_GAP', 200);
    expect(listBlocksForOwnerMock).toHaveBeenNthCalledWith(2, 'user-1', 'MASTERED_TOPIC', 200);

    // PDF builder was called with the right profile shape and sessionCount
    expect(buildLearningProfilePdfMock).toHaveBeenCalledOnce();
    const pdfArg = buildLearningProfilePdfMock.mock.calls[0][0] as {
      sessionCount: number;
      interests?: string[];
      education?: string;
    };
    expect(pdfArg.sessionCount).toBe(3);
    expect(pdfArg.interests).toEqual(['ML', 'Algorithms']);
    expect(pdfArg.education).toBe('university student');
  });

  it('throws "Storage bucket not configured" when bucket is empty', async () => {
    listBlocksForOwnerMock.mockResolvedValue([]);
    const { s3, sendMock } = buildS3();
    const adapter = directInvokeAdapter(
      buildApp({ client: buildClient(), s3, bucketName: () => '' }),
    );

    const event = buildDirectInvokeEvent('exportLearningProfile', {
      userUuid: 'user-1',
    });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Storage bucket not configured');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('400 on missing userUuid', async () => {
    const { s3, sendMock } = buildS3();
    const adapter = directInvokeAdapter(
      buildApp({ client: buildClient(), s3 }),
    );

    const event = buildDirectInvokeEvent('exportLearningProfile', {});
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
