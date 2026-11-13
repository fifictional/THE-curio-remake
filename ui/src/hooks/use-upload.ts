import { useSessionContext } from "@/providers/session-provider";
import { useCallback, useMemo, useState } from "react";
import { useUploadDocumentApi } from "./api/documents";
import { useAnalytics, useCommonContext } from "@/providers";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import { useSendActivityLogs } from "./useSendActivityLogs";

const getPageCount = async (file: File) => {
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);
  return pdf.getPageCount();
}

const imageAccepts = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
} as Record<string, string[]>
const pdfAccepts = {
  'application/pdf': ['.pdf'],
} as Record<string, string[]>
const officeAccepts = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
} as Record<string, string[]>

interface UseUploadProps {
  defaultSpaceUuid?: string;
  onDropCompleted?: () => void;
  mode?: 'all' | 'image' | 'pdf';
  onUploadStarted?: () => void;
  onUploadSuccess?: () => void;
  onUploadFailed?: () => void;
}

export const useUpload = ({ defaultSpaceUuid, onDropCompleted, mode, onUploadStarted, onUploadSuccess, onUploadFailed }: UseUploadProps) => {
  const { userAttributes } = useSessionContext();
  const { hasReachedDailyLimitForAnalysis } = useSessionContext();
  const { mutate: uploadDocument } = useUploadDocumentApi(userAttributes?.userUuid || null, defaultSpaceUuid);
  const [error, setError] = useState<string | null>(null);
  const { addInProgressUpload, removeInProgressUpload } = useCommonContext();
  const { track } = useAnalytics();
  const router = useRouter();
  const { sendActivity } = useSendActivityLogs();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    let tempError = null;

    if (hasReachedDailyLimitForAnalysis) {
      onUploadFailed?.();
      return false;
    }

    track('upload-started', {
      spaceUuid: defaultSpaceUuid || null,
      files: acceptedFiles.map(file => file.name).join(', '),
    });

    // Filter out old Office formats (.doc and .ppt) - only allow .docx and .pptx
    const files = acceptedFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      // Reject old formats
      if (fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
        tempError = 'Please upload .docx files instead of .doc files.';
        return false;
      }
      if (fileName.endsWith('.ppt') && !fileName.endsWith('.pptx')) {
        tempError = 'Please upload .pptx files instead of .ppt files.';
        return false;
      }
      return true;
    });

    if (!files.length) {
      if (tempError) {
        setError(tempError);
      }
      return;
    }

    // split pdf files from images
    const pdfFiles = files.filter(file => file.type.includes("pdf"));
    const imageFiles = files.filter(file => file.type.includes("image"));
    const officeFiles = files.filter(file => file.type.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || file.type.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || file.type.includes("application/vnd.openxmlformats-officedocument.presentationml.presentation"));

    const pdfFilesToUpload = [];
    for (const file of pdfFiles) {
      // count the page size and remove it if more than 50 pages
      const pageCount = await getPageCount(file);
      if (pageCount > 100) {
        tempError = 'Some PDFs are too large. Please upload smaller PDFs.';
        continue;
      }

      pdfFilesToUpload.push(file);
      addInProgressUpload({
        files: [file],
        key: file.name,
        originalKey: file.name,
        fileName: file.name,
        type: file.type,
        isUploading: true,
      });
    }

    if (imageFiles.length > 0) {
      // no more than 
      addInProgressUpload({
        files: imageFiles,
        key: imageFiles[0].name,
        originalKey: imageFiles[0].name,
        fileName: imageFiles[0].name,
        type: imageFiles[0].type,
        isUploading: true,
      });
    }

    if (officeFiles.length > 0) {
      addInProgressUpload({
        files: officeFiles,
        key: officeFiles[0].name,
        originalKey: officeFiles[0].name,
        fileName: officeFiles[0].name,
        type: officeFiles[0].type,
        isUploading: true,
      });
    }

    if (tempError) {
      setError(tempError);
      return;
    }

    uploadDocument(files, {
      onSuccess: (data) => {
        track('upload-success', {
          spaceUuid: defaultSpaceUuid || null,
          documentNames: files.map(file => file.name).join(', '),
        });
        setError(null);
        for (const file of files) {
          removeInProgressUpload(file.name);
        }
        if (data.length === 1) {
          if (defaultSpaceUuid) {
            router.push(`/spaces/${defaultSpaceUuid}/documents/${data[0]}`);
          } else {
            router.push(`/documents/${data[0]}`);
          }
        }

        sendActivity({
          email: userAttributes?.email ?? '', 
          lastActivityDate: new Date().toISOString(),
          traits: {
            lastActivityDate: new Date().toISOString(),
          }
        })
        
        onUploadSuccess?.();
      },
      onError: (error: any) => {
        track('upload-error', {
          spaceUuid: defaultSpaceUuid || null,
          error: error.message,
        });
        setError(error.message);
        onUploadFailed?.();
      },
    });

    // close modal
    onDropCompleted?.();
  }, [uploadDocument, addInProgressUpload, track, defaultSpaceUuid, hasReachedDailyLimitForAnalysis]);

  const accept = useMemo(() => {
    if (mode === 'all') {
      return {
        ...imageAccepts,
        ...pdfAccepts,
        ...officeAccepts,
      } as Record<string, string[]>;
    }

    if (mode === 'image') {
      return imageAccepts;
    }

    if (mode === 'pdf') {
      return {
        ...pdfAccepts,
        ...officeAccepts,
      };
    }
  }, [mode]);

  const maxImages = process.env.NEXT_PUBLIC_MAX_IMAGES ? parseInt(process.env.NEXT_PUBLIC_MAX_IMAGES) : 10;
  const maxFiles = process.env.NEXT_PUBLIC_MAX_FILES ? parseInt(process.env.NEXT_PUBLIC_MAX_FILES) : 3;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
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
    maxSize: mode === 'image' ? 25 * 1024 * 1024 : 100 * 1024 * 1024, // 25MB for image, 100MB for other files
    maxFiles: mode === 'image' ? maxImages : maxFiles,
  });

  return { error, getRootProps, getInputProps, isDragActive };
}