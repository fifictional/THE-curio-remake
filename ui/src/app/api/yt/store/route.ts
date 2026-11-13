import { NextRequest, NextResponse } from 'next/server';
import { cookieBasedClient, getUserId } from '@/lib/ssr/utils';
import { createTask } from '@/lib/ssr/data/task';
import { StoreYoutubeVideo } from '@/lib/ssr/data/yt';
import { v4 as uuidv4 } from 'uuid';
import { addUserActionLog } from '@/lib/ssr/data/userActionLog';
import { createDocumentAnalytics } from '@/lib/ssr/data/document-analytics';

export async function POST(request: NextRequest) {
  try {
    const youtubeVideo = await request.json() as StoreYoutubeVideo;
    
    if (!youtubeVideo) {
      return NextResponse.json(
        { error: 'No Youtube Video provided' },
        { status: 400 }
      );
    }

    const userUuid = await getUserId();
    if (!userUuid) {
      return NextResponse.json(
        { error: 'User ID not found in request' },
        { status: 500 }
      );
    }

    const spaceUuid = youtubeVideo.spaceUuid;

    let youtubeVideoUuid = uuidv4();
    let transcriptKey = '';

    // check if the video id is already in the database
    const existingYoutubeVideo = await cookieBasedClient.models.YoutubeVideo.listYoutubeVideoByVideoId({
      videoId: youtubeVideo.videoId,
    });
    
    console.log('existingYoutubeVideo', existingYoutubeVideo);
    if (existingYoutubeVideo.data?.length > 0) {
      // use the existing youtube video
      youtubeVideoUuid = existingYoutubeVideo.data[0].youtubeVideoUuid;
      transcriptKey = existingYoutubeVideo.data[0].transcriptKey;
    } else {
      // create a new youtube video
      await cookieBasedClient.models.YoutubeVideo.create({
        youtubeVideoUuid: youtubeVideoUuid,
        videoId: youtubeVideo.videoId,
        title: youtubeVideo.title,
        thumbnailUrl: youtubeVideo.thumbnailUrl,
        transcriptKey: transcriptKey,
      });
    }
    
    // create a new document for the video
    const newDocumentUuid = uuidv4();
    const now = new Date().toISOString();
    const document = await cookieBasedClient.models.Document.create({
      documentUuid: newDocumentUuid,
      userUuid,
      spaceUuid: spaceUuid || null,
      type: 'youtube',
      key: transcriptKey,
      fileName: youtubeVideo.title,
      youtubeVideoUuid: youtubeVideoUuid,
      createdAt: now,
      updatedAt: now,
    });

    if (!document.data) {
      console.error('Failed to create document', document);
      throw new Error('Failed to create document');
    }
    
    // Create analytics entry (don't fail if this fails)
    await createDocumentAnalytics(newDocumentUuid, 'youtube').catch((error) => {
      console.error('[yt/store] Failed to create analytics entry:', error);
    });
    
    console.log('Creating task', {
      documentUuid: newDocumentUuid,
    });
    await createTask({
      userUuid,
      documentUuid: newDocumentUuid,
    });
    await addUserActionLog({
      userUuid,
      actionType: 'analyzing_document',
      sourceType: 'youtube' as const,
      sourceUuid: newDocumentUuid,
    });
    
    return NextResponse.json({
      youtubeVideoUuid: youtubeVideoUuid,
      documentUuid: newDocumentUuid,
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
