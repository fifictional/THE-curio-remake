'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QuestionExtractJob } from '@/hooks/api/question-extractor';

interface AnswerKeyUploadProps {
  job: QuestionExtractJob;
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
}

export function AnswerKeyUpload({ job, onUpload, isUploading }: AnswerKeyUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUpload]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getStatusBadge = useCallback(() => {
    if (!job.answerKeyStatus) return null;

    switch (job.answerKeyStatus) {
      case 'PENDING':
        return (
          <Badge variant="default" className="bg-yellow-600">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'ANSWER_MODULES_EXTRACTED':
        return (
          <Badge variant="default" className="bg-purple-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Modules Identified
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
    }
  }, [job.answerKeyStatus]);

  const hasAnswerKey = !!job.answerKeyS3Key;
  const canUpload = job.status === 'QUESTION_EXTRACTED' || job.status === 'COMPLETED';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Answer Key Verification
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {/* Hidden file input - always rendered */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !canUpload}
        />
        
        {!hasAnswerKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload the answer key document to automatically verify correct answers for all questions.
            </p>
            <div>
              <Button
                onClick={handleButtonClick}
                disabled={isUploading || !canUpload}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Answer Key
                  </>
                )}
              </Button>
              {!canUpload && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete question extraction first
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">{job.answerKeyFileName}</span>
              </div>
              {job.answerKeyStatus === 'PROCESSING' && (
                <p className="text-xs text-gray-600 mt-2">
                  Extracting answers and matching them to questions...
                </p>
              )}
              {job.answerKeyStatus === 'COMPLETED' && (
                <div>
                  <p className="text-xs text-green-700 mt-2">
                    Answers have been successfully extracted and matched to questions!
                  </p>
                </div>
              )}
              {job.answerKeyStatus === 'FAILED' && job.answerKeyError && (
                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                  <strong>Error:</strong> {job.answerKeyError}
                </div>
              )}
            </div>
            {(job.answerKeyStatus === 'FAILED' || job.answerKeyStatus === 'COMPLETED') && (
              <Button
                onClick={handleButtonClick}
                variant="outline"
                size="sm"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Re-upload Answer Key
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

