'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useUploadDocumentApi } from '@/hooks/api/documents';
import { useDropzone } from 'react-dropzone';
import { UploadIcon } from 'lucide-react';
import { useCallback, useState, Suspense, useLayoutEffect } from 'react';
import { useAnalytics, useSessionContext } from '@/providers';
import { PDFDocument } from 'pdf-lib';
import { parseOptionalSpaceUuid } from '@/lib/utils/space-uuid';

const getPageCount = async (file: File) => {
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);
  return pdf.getPageCount();
};

/** Extension-based check is required when Android returns an empty MIME type for files from storage. */
function isAllowedCompanionFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const dot = lowerName.lastIndexOf('.');
  const ext = dot >= 0 ? lowerName.slice(dot) : '';
  const t = file.type.toLowerCase();

  if (t === 'application/pdf' || ext === '.pdf') return true;
  if (t === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') return true;
  if (t === 'image/png' || ext === '.png') return true;
  if (
    t.includes('wordprocessingml') ||
    t === 'application/msword' ||
    ext === '.docx' ||
    ext === '.doc'
  ) {
    return true;
  }
  if (
    t.includes('spreadsheetml') ||
    t === 'application/vnd.ms-excel' ||
    ext === '.xlsx' ||
    ext === '.xls'
  ) {
    return true;
  }
  if (
    t.includes('presentationml') ||
    t === 'application/vnd.ms-powerpoint' ||
    ext === '.pptx' ||
    ext === '.ppt'
  ) {
    return true;
  }
  return false;
}

function CompanionUploadContent() {
  const { pairCompanion } = useSessionContext();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { track } = useAnalytics();

  const userUuid = searchParams.get('userUuid');
  const spaceUuid = parseOptionalSpaceUuid(searchParams.get('spaceUuid'));
  const { mutate: uploadDocument, isPending } = useUploadDocumentApi(
    userUuid || null,
    spaceUuid || null,
    userUuid,
  );

  useLayoutEffect(() => {
    if (userUuid) {
      pairCompanion(userUuid);
    }
  }, [userUuid, pairCompanion]);

  useEffect(() => {
    if (userUuid) {
      track('companion-paired', {
        companionUuid: userUuid,
      });
    }
  }, [userUuid, track]);

  const onDrop = useCallback(async (incoming: File[]) => {
    setError(null);
    let tempError = null;

    const acceptedFiles = incoming.filter(isAllowedCompanionFile);
    if (incoming.length && !acceptedFiles.length) {
      setError(
        'Unsupported file type. Please upload PDF, images (JPG, PNG), or Office documents (DOC, DOCX, XLS, XLSX, PPT, PPTX).',
      );
      return;
    }
    if (acceptedFiles.length < incoming.length) {
      track('companion-upload-files-filtered', {
        dropped: incoming.length,
        accepted: acceptedFiles.length,
      });
    }

    track('companion-upload-started', {
      files: acceptedFiles.map(file => file.name).join(', '),
    });

    const files = acceptedFiles;
    if (!files.length) return;
    
    // split pdf files from images  
    const pdfFiles = files.filter(file => file.type.includes("pdf"));
    const remainingFiles = files.filter(file => !file.type.includes("pdf"));

    const pdfFilesToUpload = [];
    for (const file of pdfFiles) {
      // count the page size and remove it if more than 50 pages
      const pageCount = await getPageCount(file);
      if (pageCount > 100) {
        tempError = 'Some PDFs are too large. Please upload smaller PDFs.';
        continue;
      }

      pdfFilesToUpload.push(file);
    }

    if (tempError) {
      setError(tempError);
      return;
    }

    uploadDocument([...pdfFilesToUpload, ...remainingFiles], {
      onSuccess: (data) => {
        track('companion-upload-success', {
          companionUuid: userUuid,
        });
        setError(null);
        setIsSuccess(true);
      },
      onError: (error: any) => {
        track('companion-upload-error', {
          companionUuid: userUuid,
          error: error.message,
        });
        setError('Error from mutation: ' + error.message);
        setIsSuccess(false);
      },
    });
  }, [uploadDocument, track, userUuid]);

  // No `accept` on the file input: a specific MIME list makes Android Chrome show only camera/photos.
  // We validate types in onDrop instead so the system picker includes internal storage / Files.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (error) => {
      for (const err of error) {
        if (err.errors[0].code === 'file-too-large') {
          setError('Some files are too large. Please upload smaller files.');
          break;
        }
        
        setError('You can only upload up to 3 files at a time.');
      }
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: process.env.NEXT_PUBLIC_MAX_FILES ? parseInt(process.env.NEXT_PUBLIC_MAX_FILES) : 3,
  });

  if (!userUuid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Invalid Upload Link</h1>
          <p className="text-gray-600">This upload link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-green-600 mb-2">Upload Successful!</h1>
          <p className="text-gray-600">Your document has been uploaded successfully.</p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Upload Another Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-2xl font-semibold text-center mb-6">Upload Document</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center w-full h-[400px] border-2 border-dashed rounded-xl transition-colors cursor-pointer mb-4
            ${isDragActive 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-center text-gray-600 px-4">
            {isDragActive
              ? "Drop your document here..."
              : "Tap here to select a document to upload"}
          </p>
          <p className="text-sm text-gray-400 mt-2 text-center px-4">
            Supported formats: PDF, images (JPG, PNG), Word, Excel, PowerPoint
          </p>
        </div>

        {isPending && (
          <div className="text-center text-gray-600">
            <p>Uploading your document...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanionUploadPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-gray-600">
            Loading...
          </div>
        </div>
      }
    >
      <CompanionUploadContent />
    </Suspense>
  );
}