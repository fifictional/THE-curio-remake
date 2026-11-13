'use client';

import { getUrl } from "aws-amplify/storage";
import { useEffect, useState } from "react";
import { LoadingSpinnerWithType } from '@/components/ui/loading-spinner-with-type';
import { ImageIcon } from "lucide-react";

interface GeneratedImageCardProps {
  toolArguments: string;
}

interface ImageToolArguments {
  imageUrl: string;
  prompt: string;
  agentType: 'flash' | 'pro';
}

/**
 * Extracts the S3 key from an s3:// URL
 * Example: s3://bucket-name/generated-images/file.png -> generated-images/file.png
 */
function extractS3Key(s3Url: string): string | null {
  try {
    // Remove s3:// prefix
    const withoutPrefix = s3Url.replace(/^s3:\/\//, '');
    // Find the first slash after bucket name
    const firstSlashIndex = withoutPrefix.indexOf('/');
    if (firstSlashIndex === -1) {
      return null;
    }
    // Return everything after the bucket name
    return withoutPrefix.substring(firstSlashIndex + 1);
  } catch (error) {
    console.error('Error extracting S3 key:', error);
    return null;
  }
}

export function GeneratedImageCard({ toolArguments }: GeneratedImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  let parsedArgs: ImageToolArguments | null = null;
  try {
    parsedArgs = typeof toolArguments === 'string' ? JSON.parse(toolArguments) : toolArguments;
  } catch (e) {
    console.error('Error parsing toolArguments:', e);
    return null;
  }

  const { imageUrl: s3Url, agentType } = parsedArgs || {};

  useEffect(() => {
    if (!s3Url) {
      setError('No image URL provided');
      return;
    }

    // Extract S3 key from s3:// URL
    const s3Key = extractS3Key(s3Url);
    if (!s3Key) {
      setError('Invalid S3 URL format');
      return;
    }

    setLoading(true);
    setError(null);

    getUrl({ path: s3Key })
      .then((urlResult) => {
        setImageUrl(urlResult.url.href);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error getting image URL:', err);
        setError(err.message || 'Failed to load image');
        setImageUrl(null);
        setLoading(false);
      });
  }, [s3Url]);

  if (loading) {
    return (
      <div className="mt-4">
        <LoadingSpinnerWithType type='image' />
      </div>
    );
  }

  if (error || imageError) {
    return (
      <div className="mt-4 flex items-center justify-center py-8 text-gray-500">
        <ImageIcon className="w-8 h-8 mr-2" />
        <div>
          <p className="text-sm font-medium">Failed to load image</p>
          <p className="text-xs">{error || 'Image could not be displayed'}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 max-w-md">
      <div className="rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt="Generated image"
          className="max-w-full h-auto rounded-lg"
          onError={() => {
            setImageError(true);
          }}
        />
      </div>
      {agentType === 'flash' && (
        <p className="text-sm text-gray-600 italic">
          Image generated using Gemini Flash
        </p>
      )}
      {agentType === 'pro' && (
        <p className="text-sm text-gray-600 italic">
          Image generated using Gemini Pro
        </p>
      )}
    </div>
  );
}

