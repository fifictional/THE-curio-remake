import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/ssr/utils';
import {
  normalizeStudentDocumentStorageKey,
  parseOwnerUuidFromStudentDocumentKey,
} from '@/lib/utils/student-document-key';
import { createDocument, StoreDocument } from '@/lib/ssr/data/document';
import { createTask } from '@/lib/ssr/data/task';
import { addUserActionLog } from '@/lib/ssr/data/userActionLog';
import { parseOptionalSpaceUuid } from '@/lib/utils/space-uuid';
import { cookieBasedClient } from '@/lib/ssr/utils/request-helper';
import * as Sentry from '@sentry/nextjs';

const COMPANION_DESKTOP_USER_HEADER = 'x-companion-desktop-user-uuid';

export async function POST(request: NextRequest) {
  try {
    // Start early to improve performance
    const userUuidPromise = getUserId();

    const document = await request.json() as StoreDocument;
    if (!document) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
  
    // Wait for the userUuid
    const userUuid = await userUuidPromise;
    if (!userUuid) {
      return NextResponse.json(
        { error: 'User ID not found in request' },
        { status: 500 }
      );
    }

    const ownerFromUploadPath = parseOwnerUuidFromStudentDocumentKey(
      normalizeStudentDocumentStorageKey(document.originalKey)
    );

    // For companion mode uploads, the document owner is determined by the S3 path.
    // The phone may still have a stale `userId` cookie (another Cognito user); the client sends
    // the desktop user's UUID from the QR link so we can authorize without relying on the cookie alone.
    const companionDesktopUserUuid =
      request.headers.get(COMPANION_DESKTOP_USER_HEADER)?.trim() || null;
    if (companionDesktopUserUuid && ownerFromUploadPath === null) {
      return NextResponse.json(
        { error: 'Document path does not match signed-in user' },
        { status: 403 }
      );
    }
    if (
      companionDesktopUserUuid &&
      ownerFromUploadPath !== null &&
      companionDesktopUserUuid !== ownerFromUploadPath
    ) {
      return NextResponse.json(
        { error: 'Document path does not match signed-in user' },
        { status: 403 }
      );
    }

    const effectiveCookieUserUuid = companionDesktopUserUuid ?? userUuid;
    if (ownerFromUploadPath !== null && ownerFromUploadPath !== effectiveCookieUserUuid) {
      return NextResponse.json(
        { error: 'Document path does not match signed-in user' },
        { status: 403 }
      );
    }

    // Use the owner from the S3 path if available (ensures consistency for companion uploads)
    // This guarantees the document is owned by the user who uploaded it via their UUID in the path
    const documentOwnerUuid = ownerFromUploadPath || effectiveCookieUserUuid;

    const spaceUuid = parseOptionalSpaceUuid(document.spaceUuid ?? null);

    const documentForCreate: StoreDocument = {
      ...document,
      originalKey: normalizeStudentDocumentStorageKey(document.originalKey),
    };

    const newDocument = await createDocument(documentOwnerUuid, documentForCreate, spaceUuid);

    try {
      await createTask({
        userUuid: documentOwnerUuid,
        documentUuid: newDocument.documentUuid,
      });
    } catch (taskError) {
      // Without the Task row, the DynamoDB stream → SQS → dispatcher pipeline
      // never fires, so the document would stay stuck with `key: ''` forever.
      // Roll back the document so the client can retry cleanly, and surface
      // the real error to Sentry/CloudWatch instead of returning a fake 200.
      console.error('[documents/store] createTask failed, rolling back document', {
        documentUuid: newDocument.documentUuid,
        userUuid: documentOwnerUuid,
        companion: Boolean(companionDesktopUserUuid),
        error: taskError,
      });
      Sentry.captureException(taskError, {
        tags: { scope: 'documents/store', step: 'createTask' },
        extra: {
          documentUuid: newDocument.documentUuid,
          userUuid: documentOwnerUuid,
          companion: Boolean(companionDesktopUserUuid),
        },
      });
      await cookieBasedClient.models.Document
        .delete({ documentUuid: newDocument.documentUuid })
        .catch((rollbackErr) => {
          console.error('[documents/store] document rollback also failed', {
            documentUuid: newDocument.documentUuid,
            rollbackErr,
          });
        });
      return NextResponse.json(
        { error: 'Failed to queue document for processing. Please try again.' },
        { status: 500 }
      );
    }

    await addUserActionLog({
      userUuid: documentOwnerUuid,
      actionType: 'analyzing_document',
      sourceType: 'document' as const,
      sourceUuid: newDocument.documentUuid,
    });

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    Sentry.captureException(error, {
      tags: { scope: 'documents/store' },
    });
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
