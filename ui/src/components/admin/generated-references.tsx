'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ImageIcon, AlertCircle, CheckCircle, FileIcon, Sparkles } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { QuestionReferenceImage } from '@/components/ui/question-reference-image';
import { remove } from "@/lib/local-storage";

interface GeneratedReferencesProps {
  question: ExtractedQuestion;
  isGenerating?: boolean;
  onGenerateReference?: (questionUuid: string) => Promise<void>;
  onSave?: (question: ExtractedQuestion) => Promise<void>;
}

export function GeneratedReferences({
  question,
  isGenerating = false,
  onGenerateReference,
  onSave,
}: GeneratedReferencesProps) {
  const [editedPrompt, setEditedPrompt] = useState<string>('');

  // Initialize prompt from question
  useEffect(() => {
    if (question.referenceGenerationPrompt) {
      setEditedPrompt(question.referenceGenerationPrompt);
    }
  }, [question.referenceGenerationPrompt]);

  // State: Reference is not needed
  if (!question.needsReference) {
    return null; // Don't show anything if reference is not needed
  }

  const hasReference = question.questionReference && 
    question.questionReference.referenceType !== 'none' &&
    question.referenceExtractionStatus === 'EXTRACTED';

  const handleSavePrompt = async () => {
    if (!onSave || !editedPrompt.trim()) return;
    try {
      const payload: any = {
        ...question,
        referenceGenerationPrompt: editedPrompt.trim(),
      };
      await onSave(payload);
    } catch (e) {
      console.error('Error saving prompt:', e);
    }
  };

  // State: Reference needed but not generated
  if (!hasReference) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
        <h3 className="text-sm font-semibold">Reference Generation</h3>
        
        {/* Loading state */}
        {question.referenceExtractionStatus === 'EXTRACTING' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Reference...
            </h3>
            <p className="text-sm text-blue-700">Please wait while the reference is being generated.</p>
          </div>
        )}

        {/* Error state */}
        {question.referenceExtractionStatus === 'FAILED' && question.referenceExtractionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Reference Generation Error
            </h3>
            <p className="text-sm text-red-700">{question.referenceExtractionError}</p>
          </div>
        )}

        {/* Generation prompt */}
        {question.referenceGenerationPrompt && (
          <div className="text-xs bg-purple-50 border border-purple-200 p-3 rounded">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold text-purple-700">🎨 Reference Prompt:</span>
            </div>
            <p className="text-purple-600">{question.referenceGenerationPrompt}</p>
          </div>
        )}

        {/* Generate button */}
        {onGenerateReference && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onGenerateReference(question.extractedQuestionUuid)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                {question.referenceExtractionStatus === 'FAILED' ? 'Retry Generate' : 'Generate Reference'}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // State: Reference generated
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reference Information</h3>
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Generated
        </Badge>
      </div>

      <div className="text-xs space-y-1">
        <div>Type: <span className="font-medium capitalize">{question.questionReference?.referenceType || 'unknown'}</span></div>
        {question.questionReference?.text && !question.questionReference?.s3Key && (
          <div className="text-xs text-gray-500">Text Reference (Generated)</div>
        )}
      </div>

      {/* Prompt Editor */}
      {question.referenceGenerationPrompt && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Reference Generation Prompt</Label>
          <Textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={3}
            className="text-xs"
            placeholder="Enter the prompt for generating this reference..."
          />
        </div>
      )}

      {/* Re-generate button (saves prompt if edited, then regenerates) */}
      {onGenerateReference && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            // Delete old S3 file before clearing reference
            if (question.questionReference?.s3Key) {
              try {
                // Delete the old S3 file
                await remove({ path: question.questionReference.s3Key });
                console.log('Successfully deleted old reference file from S3');
              } catch (deleteError: any) {
                console.error('Error deleting old reference file from S3:', deleteError);
                // Continue with regeneration even if deletion fails
              }
            }

            // Save the updated prompt and clear the reference in a single operation
            if (onSave) {
              try {
                const payload: any = {
                  ...question,
                  // Always save the current edited prompt
                  referenceGenerationPrompt: editedPrompt.trim() || question.referenceGenerationPrompt,
                  // Clear the reference data
                  questionReference: question.questionReference ? {
                    referenceType: question.questionReference.referenceType || 'none',
                    page: question.questionReference.page ?? 0,
                    boundingBox: question.questionReference.boundingBox ?? [],
                    s3Key: null,
                    text: null, // Also clear text reference if it exists
                  } : null,
                  referenceExtractionStatus: null,
                  referenceExtractionError: null,
                };
                console.log('Saving prompt and clearing reference before regeneration:', payload.referenceGenerationPrompt);
                await onSave(payload);
                console.log('Prompt saved and reference cleared successfully');
              } catch (e) {
                console.error('Error saving prompt/clearing reference before regeneration:', e);
                alert('Failed to save prompt. Regeneration may use the old prompt.');
                // Continue with regeneration even if saving fails
              }
            }

            // Trigger regeneration
            await onGenerateReference(question.extractedQuestionUuid);
          }}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Re-generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Re-generate Reference
            </>
          )}
        </Button>
      )}

      {/* Reference Display */}
      {(question.questionReference?.s3Key || question.questionReference?.text) && (
        <div className="space-y-2">
          <div className="text-xs font-semibold flex items-center gap-1">
            {question.questionReference.text && !question.questionReference.s3Key ? (
              <>
                <FileIcon className="w-3 h-3" />
                Reference Preview ({question.questionReference.referenceType === 'table' ? 'Table' : 'Passage'})
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3" />
                Reference Preview
              </>
            )}
          </div>
          <div className="border rounded bg-white p-2">
            <QuestionReferenceImage
              reference={{
                page: question.questionReference?.page || 0,
                referenceType: question.questionReference?.referenceType === 'table' 
                  ? 'table' 
                  : question.questionReference?.referenceType === 'passage'
                  ? 'text'
                  : 'image',
                externalKey: question.questionReference?.s3Key,
                boundingBox: question.questionReference?.boundingBox || [],
                text: question.questionReference?.text,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

