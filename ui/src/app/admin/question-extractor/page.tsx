'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionExtractorApi } from '@/hooks/api/question-extractor';
import { useExamExtractionFileUpload } from '@/hooks/use-exam-extraction-file-upload';
import { ExamPaperUpload } from '@/components/admin/exam-paper-upload';
import { QuestionExtractJobsList } from '@/components/admin/question-extract-jobs-list';

export default function QuestionExtractorPage() {
  const router = useRouter();
  const { uploadFile } = useQuestionExtractorApi(null);

  const handleUploadFile = useCallback(async (file: File) => {
    const jobUuid = await uploadFile(file);
    if (jobUuid) {
      router.push(`/admin/question-extractor/${jobUuid}`);
    }
    return jobUuid;
  }, [uploadFile, router]);

  const {
    selectedFile,
    isUploading,
    handleFileSelect,
    handleUpload,
    clearFile,
  } = useExamExtractionFileUpload({
    validTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    onUpload: handleUploadFile,
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Question Extractor</h1>
        <p className="text-muted-foreground">
          Upload exam papers to extract questions automatically
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <ExamPaperUpload
          selectedFile={selectedFile}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          onCancel={clearFile}
        />
      </div>

      {/* Jobs History */}
      <QuestionExtractJobsList />
    </div>
  );
}

