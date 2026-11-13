import fetch from 'node-fetch';
import { getYoutubeApiKey } from "../get-youtube-apikey";

export interface YoutubeMetadata {
  title: string;
  description: string;
  duration: string; // ISO 8601 format without PT prefix (e.g., "4M13S")
}

interface YoutubeApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

/**
 * Fetches YouTube video metadata (title, description, duration) using the YouTube Data API v3
 * @param videoId - The YouTube video ID
 * @returns Promise with video metadata
 */
export async function getYoutubeMetadata(videoId: string): Promise<YoutubeMetadata> {
  const apiKey = await getYoutubeApiKey();

  if (!apiKey) {
    throw new Error('YouTube API key not found in Secrets Manager');
  }

  // Use part=snippet for title/description and contentDetails for duration
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`YouTube API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as YoutubeApiResponse;

  if (!data.items || data.items.length === 0) {
    throw new Error(`YouTube video not found: ${videoId}`);
  }

  const video = data.items[0];
  const duration = video.contentDetails.duration;

  // Remove PT prefix from ISO 8601 duration format
  // PT4M13S -> 4M13S
  const durationWithoutPT = duration.replace(/^PT/, '');

  return {
    title: video.snippet.title,
    description: video.snippet.description || '',
    duration: durationWithoutPT,
  };
}

