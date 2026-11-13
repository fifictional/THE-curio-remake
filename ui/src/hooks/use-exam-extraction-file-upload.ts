import { useState, useCallback } from 'react';

interface UseExamExtractionFileUploadOptions {
  validTypes?: string[];
  onUpload?: (file: File) => Promise<string | null>;
}

export function useExamExtractionFileUpload({ validTypes, onUpload }: UseExamExtractionFileUploadOptions) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (validTypes && !validTypes.includes(file.type)) {
        alert(`Please select a valid file type: ${validTypes.join(', ')}`);
        return;
      }
      setSelectedFile(file);
    }
  }, [validTypes]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !onUpload) return null;
    
    setIsUploading(true);
    try {
      const result = await onUpload(selectedFile);
      if (result) {
        setSelectedFile(null);
      }
      return result;
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, onUpload]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return {
    selectedFile,
    isUploading,
    handleFileSelect,
    handleUpload,
    clearFile,
  };
}

