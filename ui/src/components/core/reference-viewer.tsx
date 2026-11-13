'use client';

import { useReferenceUrlApi } from '@/hooks/api/use-reference-url.api';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ReferenceViewerProps {
  referenceType?: string;
  referenceName?: string;
  className?: string;
}

export function ReferenceViewer({ 
  referenceType, 
  referenceName,
  className 
}: ReferenceViewerProps) {
  const url = useReferenceUrlApi(referenceName);
  const [error, setError] = useState<string | null>(null);

  if (!url) {
    return (
      <div className={cn("flex items-center justify-center p-4 bg-gray-50 rounded-lg", className)}>
        <div className="text-gray-500 text-sm">Loading reference...</div>
      </div>
    );
  }

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      {(referenceType || referenceName) && (
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            {referenceType && <span className="font-medium">{referenceType}</span>}
            {referenceName && (
              <span className="ml-1">
                {referenceType && ': '}
                {referenceName}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Image Viewer */}
      <div className="bg-white p-2 flex justify-center">
        <img 
          src={url} 
          alt={referenceName || 'Reference image'}
          className="max-w-full h-auto max-h-96 object-contain"
          onLoad={() => setError(null)}
          onError={() => setError('Image failed to load')}
        />
      </div>
      
      {/* Show error if image fails to load */}
      {error && (
        <div className="bg-red-50 px-3 py-2 border-t border-red-200">
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
} 