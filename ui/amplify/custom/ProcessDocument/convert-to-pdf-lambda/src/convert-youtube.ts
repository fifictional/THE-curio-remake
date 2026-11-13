import { Logger } from "@aws-lambda-powertools/logger";
import { S3Client, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { StudentDocument } from "./common/types";
import { getYoutubeVideo } from "./common/database/get-youtube-video";
import { updateYoutubeVideo } from "./common/database/update-youtube-video";
import { updateDocument } from "./common/database/update-document";
import { getYoutubeTranscript } from "./common/youtube/get-youtube-transcript";
import { getYoutubeMetadata, YoutubeMetadata } from "./common/youtube/get-youtube-metadata";

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

function formatMillisecondsToTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.min(999, Math.round(ms % 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const h = hours.toString().padStart(1, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  const mm = milliseconds.toString().padStart(3, '0');

  return `${h}:${m}:${s}.${mm}`;
}

function getLanguageName(langCode: string): string {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
  };
  
  return languageNames[langCode] || langCode.toUpperCase();
}

function formatTranscriptAsMarkdown(
  transcriptJson: string,
  metadata: YoutubeMetadata,
  videoId: string
): string {
  let transcriptSegments: TranscriptSegment[] = [];
  
  try {
    const parsed = JSON.parse(transcriptJson);
    if (Array.isArray(parsed)) {
      transcriptSegments = parsed;
    }
  } catch (error) {
    // If parsing fails, treat the entire string as a single segment
    transcriptSegments = [{ text: transcriptJson, duration: 0, offset: 0, lang: 'en' }];
  }

  // Count languages and find the most common one
  const languageCounts: Record<string, number> = {};
  transcriptSegments.forEach(segment => {
    const lang = segment.lang || 'en';
    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
  });

  // Sort languages by count (descending)
  const sortedLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  const primaryLanguage = sortedLanguages[0] || 'en';
  const primaryLanguageName = getLanguageName(primaryLanguage);

  // Format duration for display (e.g., "4M13S" -> "4 minutes 13 seconds")
  const formatDuration = (duration: string): string => {
    const parts: string[] = [];
    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    const seconds = duration.match(/(\d+)S/);
    
    if (hours) parts.push(`${hours[1]} hour${hours[1] !== '1' ? 's' : ''}`);
    if (minutes) parts.push(`${minutes[1]} minute${minutes[1] !== '1' ? 's' : ''}`);
    if (seconds) parts.push(`${seconds[1]} second${seconds[1] !== '1' ? 's' : ''}`);
    
    return parts.join(' ') || duration;
  };

  // Build markdown content
  const markdown = [
    `# ${metadata.title}`,
    '',
    `**Duration:** ${formatDuration(metadata.duration)}`,
    `**Video ID:** ${videoId}`,
    `**URL:** https://www.youtube.com/watch?v=${videoId}`,
    '',
  ];

  // Add description if available
  if (metadata.description && metadata.description.trim()) {
    markdown.push('## Description', '', metadata.description, '');
  }

  // Add transcript format description
  markdown.push(
    '## Transcript Format',
    '',
    'This transcript is formatted for easy parsing by LLMs and other automated systems.',
    '',
    '### Language Information',
    `- **Primary Language:** ${primaryLanguageName} (${primaryLanguage})`,
    `- **Languages Detected:** ${sortedLanguages.map(lang => `${getLanguageName(lang)} (${lang})`).join(', ')}`,
    `- **Language Distribution:** ${sortedLanguages.map(lang => `${getLanguageName(lang)}: ${languageCounts[lang]} segments`).join(', ')}`,
    '',
    '### Transcript Format',
    'Each transcript line follows this format:',
    '',
    '```',
    '[H:M:S.mmm-H:M:S.mmm] [lang:XX] Text content',
    '```',
    '',
    'Where:',
    '- `H:M:S.mmm-H:M:S.mmm` represents the start and end timestamps in hours:minutes:seconds.milliseconds format',
    '- `[lang:XX]` is optional and only appears when the segment language differs from the primary language',
    '- The text content follows the timestamp and optional language indicator',
    '',
    '**Note:** Unless otherwise stated, all transcript segments are in ' + primaryLanguageName + '.',
    '',
  );

  // Add transcript
  markdown.push('## Transcript', '');
  
  // Format each transcript segment
  transcriptSegments.forEach(segment => {
    const startTime = formatMillisecondsToTimestamp(segment.offset);
    const endTime = formatMillisecondsToTimestamp(segment.offset + segment.duration);
    const lang = segment.lang || primaryLanguage;
    
    let line = `[${startTime}-${endTime}]`;
    
    // Add language indicator if different from primary language
    if (lang !== primaryLanguage) {
      line += ` [lang:${lang}]`;
    }
    
    line += ` ${segment.text}`;
    
    markdown.push(line);
  });

  return markdown.join('\n');
}

export async function convertYoutube(
  document: StudentDocument,
  logger: Logger,
  s3Client: S3Client
): Promise<{ document: StudentDocument }> {
  logger.info('File is a youtube video', {
    s3Key: document.key,
  });
  
  // get transcript from youtube video
  const youtubeVideoUuid = document.youtubeVideoUuid;
  logger.info('youtube video uuid', {
    youtubeVideoUuid,
  });
  if (!youtubeVideoUuid) {
    throw new Error('Youtube video uuid is required');
  }
  const youtubeVideo = await getYoutubeVideo(youtubeVideoUuid);
  if (!youtubeVideo) {
    throw new Error('Youtube video not found');
  }

  logger.info('Checking if transcript already exists in S3', {
    s3Key: document.key,
  });
  // check if we already have a transcript for this video
  // check if file exists in S3
  if (document.key && youtubeVideo.transcriptKey) {
    logger.info('Transcript already exists in S3', {
      s3Key: document.key,
    });

    // copy transcript to document s3 key
    document.key = `student-documents/${document.userUuid}/${document.documentUuid}/youtube-transcript.md`;
    await s3Client.send(new CopyObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: document.key,
      CopySource: `${process.env.AWS_BUCKET_NAME}/${youtubeVideo.transcriptKey}`,
    }));
    
    // update document with new s3 key
    await updateDocument(document.documentUuid, {
      key: document.key,
    });

    return {
      document,
    };
  }

  logger.info('Downloading transcript and metadata from Youtube', {
    videoId: youtubeVideo.videoId,
  });

  // Fetch transcript and metadata in parallel
  const [transcriptJson, metadata] = await Promise.all([
    getYoutubeTranscript(youtubeVideo.videoId),
    getYoutubeMetadata(youtubeVideo.videoId),
  ]);

  // Convert transcript to markdown format
  const transcriptMarkdown = formatTranscriptAsMarkdown(
    transcriptJson,
    metadata,
    youtubeVideo.videoId
  );

  // write transcript to s3 as markdown file
  const transcriptS3Key = `yt-transcripts/${youtubeVideo.videoId}/youtube-transcript.md`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: transcriptS3Key,
    Body: transcriptMarkdown,
  }));

  await updateYoutubeVideo(youtubeVideoUuid, {
    transcriptKey: transcriptS3Key,
  });

  // copy transcript to document s3 key
  document.key = `student-documents/${document.userUuid}/${document.documentUuid}/youtube-transcript.md`;
  await s3Client.send(new CopyObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: document.key,
    CopySource: `${process.env.AWS_BUCKET_NAME}/${transcriptS3Key}`,
  }));
  
  // update document with new s3 key
  await updateDocument(document.documentUuid, {
    key: document.key,
  });

  return {
    document,
  };
}
