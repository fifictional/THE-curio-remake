'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, FileText, Image as ImageIcon } from 'lucide-react';

interface ExamPaperUploadProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
}

export function ExamPaperUpload({
  selectedFile,
  isUploading,
  onFileSelect,
  onUpload,
  onCancel,
}: ExamPaperUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Exam Paper</CardTitle>
        <CardDescription>
          Select a PDF or image file containing exam questions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {selectedFile ? (
                  <>
                    {selectedFile.type === 'application/pdf' ? (
                      <FileText className="w-12 h-12 mb-3 text-blue-500" />
                    ) : (
                      <ImageIcon className="w-12 h-12 mb-3 text-green-500" />
                    )}
                    <p className="mb-2 text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF or Image (PNG, JPG)</p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,image/jpeg,image/jpg,image/png"
                onChange={onFileSelect}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex gap-3">
              <Button
                onClick={onUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Extract Questions
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

