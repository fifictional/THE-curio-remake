'use client';

import { useMockExamReferenceUrlApi } from "@/hooks/api/use-mock-exam-reference-url.api";
import { ImageIcon, FileIcon } from "lucide-react";
import { useState } from "react";
import { Document, Page } from 'react-pdf';
import { LoadingSpinnerWithType } from '@/components/ui/loading-spinner-with-type';

interface QuestionReferenceImageProps {
  reference: {
    referenceType: 'image' | 'text' | 'table';
    page: number;
    boundingBox?: number[];
    text?: string;
    externalKey?: string;
  };
}

export function QuestionReferenceImage({ reference }: QuestionReferenceImageProps) {
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // Get the S3 URL for the reference image (only if externalKey exists)
  const { url: imageUrl, loading: imageLoading, error: urlError } = useMockExamReferenceUrlApi(reference.externalKey);
  
  // Check if the file is a PDF or PNG
  const isPdf = reference.externalKey?.toLowerCase().endsWith('.pdf');
  const isPng = reference.externalKey?.toLowerCase().endsWith('.png');

  // If there's no external key, this is a text-only reference (generated)
  const isTextOnly = !reference.externalKey && reference.text;

  return (
    <div className="mb-4">
        {/* Text-only reference (generated references) */}
        {isTextOnly && (
          <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Generated Reference</p>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 whitespace-pre-wrap">{reference.text}</div>
            </div>
          </div>
        )}

        {!isTextOnly && imageLoading && (
          <LoadingSpinnerWithType type='image' />
        )}

        {!isTextOnly && (imageError || pdfError || urlError) && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            {isPdf ? <FileIcon className="w-8 h-8 mr-2" /> : <ImageIcon className="w-8 h-8 mr-2" />}
            <div>
              <p className="text-sm font-medium">Failed to load {isPdf ? 'PDF' : isPng ? 'PNG' : 'image'}</p>
              <p className="text-xs">{urlError || `Reference ${isPdf ? 'PDF' : isPng ? 'PNG' : 'image'} could not be displayed`}</p>
            </div>
          </div>
        )}

        {!isTextOnly && imageUrl && !imageError && !pdfError && !urlError && (
          <div className="space-y-2">
            {isPdf ? (
              <div className="">
                <Document
                  file={imageUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={(error) => {
                    console.error('PDF load error:', error);
                    setPdfError(true);
                  }}
                  loading={
                    <LoadingSpinnerWithType type='pdf' />
                  }
                >
                  <Page 
                    pageNumber={1} 
                    width={Math.min(600, window.innerWidth - 100)}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
                {numPages && numPages > 1 && (
                  <div className="text-xs text-gray-500 text-center py-2 bg-gray-50">
                    Page 1 of {numPages}
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Reference ${reference.referenceType}`}
                  className="max-w-full h-auto rounded-lg"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    console.error('Failed to load image URL:', imageUrl);
                    console.error('Image error event:', e.currentTarget);
                    setImageError(true);
                  }}
                  onLoad={(e) => {
                    console.log('Image loaded successfully:', imageUrl);
                    console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                  }}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
                {isPng && (
                  <div className="text-xs text-gray-500 text-center py-2 bg-gray-50">
                    Cropped Image (PNG)
                  </div>
                )}
              </div>
            )}
            
            {reference.text && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <p className="font-medium text-gray-700">Reference Text:</p>
                <p className="text-gray-600">{reference.text}</p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
