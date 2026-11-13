import { UserContentItem } from './types';

/**
 * Common MIME type constants
 */
export const MIME_TYPES = {
  TEXT_PLAIN: 'text/plain',
  TEXT_MARKDOWN: 'text/markdown',
  IMAGE_PNG: 'image/png',
  AUDIO_MPEG: 'audio/mpeg',
  APPLICATION_PDF: 'application/pdf',
} as const;

/**
 * Common file extensions
 */
export const FILE_EXTENSIONS = {
  PDF: 'pdf',
  TXT: 'txt',
  MD: 'md',
  MP3: 'mp3',
  WAV: 'wav',
  PNG: 'png',
  BIN: 'bin',
} as const;

/**
 * Get file extension from URL or MIME type
 */
export function getFileExtension(urlOrMimeType: string): string | null {
  // Try as URL first
  const urlMatch = urlOrMimeType.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }
  // Try as mimeType
  const mimeMatch = urlOrMimeType.match(/\/([a-z0-9]+)$/i);
  if (mimeMatch) {
    return mimeMatch[1].toLowerCase();
  }
  return null;
}

/**
 * Download text content from a URL
 */
export async function downloadTextFromURL(url: string, providerName: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[${providerName}] Error downloading text from ${url}: Response status: ${response.status}`);
  }
  return await response.text();
}

/**
 * Download binary content from a URL and convert to base64
 */
export async function downloadBinaryFromURL(url: string, providerName: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[${providerName}] Error downloading binary from ${url}: Response status: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

/**
 * Resolve text content from UserContentItem
 * Returns the text content, downloading from URL if necessary
 */
export async function resolveTextContent(
  item: UserContentItem,
  providerName: string
): Promise<string | null> {
  if (item.contentURL) {
    return await downloadTextFromURL(item.contentURL, providerName);
  } else if (item.content) {
    // Plain text content (content field should be plain text, not base64 for text types)
    return item.content;
  }
  return null;
}

/**
 * Resolve binary content from UserContentItem
 * Returns the base64 content, downloading from URL if necessary
 */
export async function resolveBinaryContent(
  item: UserContentItem,
  providerName: string
): Promise<string | null> {
  if (item.contentURL) {
    return await downloadBinaryFromURL(item.contentURL, providerName);
  } else if (item.content) {
    // Content should be raw base64
    return item.content;
  }
  return null;
}

/**
 * Resolve content URL from UserContentItem
 * Returns the URL if present, otherwise null
 */
export function resolveContentURL(item: UserContentItem): string | null {
  return item.contentURL || null;
}

/**
 * Truncate base64 strings in an object for logging
 * Recursively traverses objects and arrays, truncating long base64 strings to 20 characters
 * Useful for logging request/response bodies that may contain large base64-encoded data
 */
export function truncateBase64ForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Check if it's a base64 string (long string, typically >100 chars, and matches base64 pattern)
    // Also check for data URLs with base64
    if (obj.length > 100 && /^[A-Za-z0-9+/=]+$/.test(obj.replace(/^data:[^;]+;base64,/, ''))) {
      const truncated = obj.substring(0, 20);
      return `${truncated}...`;
    }
    // Check for data URLs with base64
    if (obj.startsWith('data:') && obj.includes('base64,')) {
      const base64Part = obj.split('base64,')[1];
      if (base64Part && base64Part.length > 20) {
        return obj.substring(0, obj.indexOf('base64,') + 7) + base64Part.substring(0, 20) + '...';
      }
    }
    // Check for plain base64 strings (used in input_audio.data)
    if (obj.length > 100 && /^[A-Za-z0-9+/=]+$/.test(obj)) {
      return obj.substring(0, 20) + '...';
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => truncateBase64ForLogging(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = truncateBase64ForLogging(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}
