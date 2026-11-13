import { Supadata } from "@supadata/js";
import { getSupadataApiKey } from "../get-supadata-apikey";

export async function getYoutubeTranscript(videoId: string): Promise<string> {
  const apiKey = await getSupadataApiKey();

  // check if cookies file exists in tmp folder
  const supadata = new Supadata({
    apiKey: apiKey,
  });

  // Get transcript from any supported platform (YouTube, TikTok, Instagram, X (Twitter)) or file
  let transcriptResult;
  try {
    transcriptResult = await supadata.transcript({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      lang: "en", // optional
      mode: "auto", // optional: 'native', 'auto', or 'generate'
    });
  } catch (error) {
    throw new Error(`SupadataError: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }

  if ('content' in transcriptResult) {
    return JSON.stringify(transcriptResult.content);
  }

  throw new Error('FETCH_FAILED: Failed to get transcript');
}

