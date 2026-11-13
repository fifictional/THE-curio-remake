'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, AlertCircle, CheckCircle, ImageIcon, FileIcon, Trash2 } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { QuestionReferenceImage } from '@/components/ui/question-reference-image';

interface ExtractedReferencesProps {
  question: ExtractedQuestion;
  isExtracting?: boolean;
  isRecropping?: boolean;
  onExtractReference?: (questionUuid: string) => Promise<void>;
  onRecrop?: (questionUuid: string, referenceType: 'image' | 'graph' | 'chart' | 'table' | 'passage', page: number, boundingBox: number[]) => Promise<boolean>;
  onDeleteReference?: () => void;
  shouldDeleteReference?: boolean;
  onUndoDelete?: () => void;
  onSave?: (question: ExtractedQuestion) => Promise<void>;
}

export function ExtractedReferences({
  question,
  isExtracting = false,
  isRecropping = false,
  onExtractReference,
  onRecrop,
  onDeleteReference,
  onSave,
  shouldDeleteReference: propShouldDelete,
  onUndoDelete,
}: ExtractedReferencesProps) {
  const [editedBoundingBox, setEditedBoundingBox] = useState<number[]>([]);
  const [editedReferencePage, setEditedReferencePage] = useState<number>(0);
  const [internalShouldDelete, setInternalShouldDelete] = useState(false);

  // Use prop if provided, otherwise use internal state
  const isDeleting = propShouldDelete !== undefined ? propShouldDelete : internalShouldDelete;

  // Initialize state from question
  useEffect(() => {
    if (question) {
      setEditedBoundingBox(question.questionReference?.boundingBox || []);
      setEditedReferencePage(question.questionReference?.page ?? 0);
      setInternalShouldDelete(false);
    }
  }, [question]);

  const handleBoundingBoxChange = (index: number, value: string) => {
    const newBoundingBox = [...editedBoundingBox];
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      newBoundingBox[index] = numValue;
      setEditedBoundingBox(newBoundingBox);
    }
  };

  const handleRecrop = async () => {
    if (!question || !onRecrop || !editedBoundingBox || editedBoundingBox.length !== 4) {
      alert('Invalid bounding box. Please ensure all 4 values are set.');
      return;
    }

    if (!onSave) return;

    try {
      await onSave({
        ...question,
        referenceExtractionStatus: 'EXTRACTING',
      });
      await onRecrop(question.extractedQuestionUuid, question.questionReference?.referenceType as 'image' | 'graph' | 'chart' | 'table' | 'passage', editedReferencePage || 0, editedBoundingBox);
    } catch (error) {
      console.error('Error recropping:', error);
    }
  };

  const handleExtractReference = async () => {
    if (!question || !onExtractReference) return;
    
    // First, save the updated page number if it changed
    if (editedReferencePage !== (question.questionReference?.page ?? 0) && onSave && question.questionReference) {
      try {
        const payload: any = {
          ...question,
          questionReference: {
            referenceType: question.questionReference.referenceType || 'none',
            page: editedReferencePage,
            boundingBox: editedBoundingBox,
            s3Key: null,
            text: null,
          },
        };
        await onSave(payload);
      } catch (e) {
        console.error('Error updating page number:', e);
        return;
      }
    }
    
    // Then trigger extraction
    await onExtractReference(question.extractedQuestionUuid);
  };

  const handleForceExtract = async () => {
    if (!question || !onSave) return;
    if (!editedBoundingBox || editedBoundingBox.length !== 4) {
      alert('Please provide all 4 bounding box values.');
      return;
    }
    try {
      await onSave({
        ...question,
        referenceExtractionStatus: 'EXTRACTING',
      });
      if (onRecrop) {
        await onRecrop(question.extractedQuestionUuid, 'image', editedReferencePage || 0, editedBoundingBox);
      }
    } catch (e) {
      console.error('Error forcing reference extraction:', e);
    }
  };

  // State: No reference needed - show force crop option
  if (!question.questionReference || question.questionReference.referenceType === 'none') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
        <p className="text-sm text-gray-700 font-medium">This question has no visual reference.</p>
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-1">
            <Label className="text-xs font-semibold">Page</Label>
            <Input
              type="number"
              value={editedReferencePage}
              onChange={(e) => setEditedReferencePage(parseInt(e.target.value || '0', 10))}
              className="text-xs mt-1"
            />
          </div>
          <div className="col-span-4">
            <Label className="text-xs font-semibold">Bounding Box [x_min, y_min, x_max, y_max]</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(editedBoundingBox.length ? editedBoundingBox : [0,0,0,0]).map((value, index) => (
                <Input
                  key={index}
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) => handleBoundingBoxChange(index, e.target.value)}
                  className="text-xs"
                  placeholder={['y_min', 'x_min', 'y_max', 'x_max'][index]}
                />
              ))}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleForceExtract}
          disabled={isRecropping || editedBoundingBox.length !== 4}
          className="w-full"
        >
          {isRecropping ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting Reference...
            </>
          ) : (
            'Force Extract Reference'
          )}
        </Button>
      </div>
    );
  }

  const hasReference = !!question.questionReference && 
    !!question.questionReference.referenceType;
  const isExtracted = question.referenceExtractionStatus === 'EXTRACTED';
  const isExtractingNow = question.referenceExtractionStatus === 'EXTRACTING';
  const hasFailed = question.referenceExtractionStatus === 'FAILED';

  // Show deletion message if marked for deletion
  if (isDeleting) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-800 flex items-center">
              <Trash2 className="w-4 h-4 mr-2" />
              Reference Will Be Deleted
            </h3>
            <p className="text-sm text-red-700 mt-1">The reference will be removed when you save changes.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onUndoDelete) {
                onUndoDelete();
              } else {
                setInternalShouldDelete(false);
              }
            }}
          >
            Undo
          </Button>
        </div>
      </div>
    );
  }

  // State: Reference found but not extracted
  if (hasReference && !isExtracted) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Reference Information</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onDeleteReference) {
                onDeleteReference();
              } else {
                setInternalShouldDelete(true);
              }
            }}
            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>

        {/* Loading state */}
        {isExtractingNow && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Extracting Reference...
            </h3>
            <p className="text-sm text-blue-700">Please wait while the reference is being extracted.</p>
          </div>
        )}

        {/* Error state */}
        {hasFailed && question.referenceExtractionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Reference Extraction Error
            </h3>
            <p className="text-sm text-red-700">{question.referenceExtractionError}</p>
          </div>
        )}

        <div className="text-xs space-y-1">
          <div>Type: <span className="font-medium capitalize">{question.questionReference.referenceType}</span></div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Page:</Label>
            <Input
              type="number"
              value={editedReferencePage}
              onChange={(e) => setEditedReferencePage(parseInt(e.target.value || '0', 10))}
              className="text-xs w-20 h-7"
              min="0"
            />
          </div>
        </div>

        {/* Bounding Box Editor - Only show for image references */}
        {editedBoundingBox.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Bounding Box [x_min, y_min, x_max, y_max]</Label>
            <div className="grid grid-cols-4 gap-2">
              {editedBoundingBox.map((value, index) => (
                <Input
                  key={index}
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) => handleBoundingBoxChange(index, e.target.value)}
                  className="text-xs"
                  placeholder={['y_min', 'x_min', 'y_max', 'x_max'][index]}
                />
              ))}
            </div>
            {onExtractReference && (
              <Button
                size="sm"
                variant="outline"
                onClick={hasFailed ? handleRecrop : handleExtractReference}
                className="w-full"
                disabled={isExtracting || editedBoundingBox.length !== 4}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    {hasFailed ? 'Retry Extract' : 'Extract Reference'}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // State: Reference found and extracted - allow re-extraction
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reference Information</h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Extracted
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onDeleteReference) {
                onDeleteReference();
              } else {
                setInternalShouldDelete(true);
              }
            }}
            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="text-xs space-y-1">
        <div>Type: <span className="font-medium capitalize">{question.questionReference.referenceType}</span></div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium">Page:</Label>
          <Input
            type="number"
            value={editedReferencePage}
            onChange={(e) => setEditedReferencePage(parseInt(e.target.value || '0', 10))}
            className="text-xs w-20 h-7"
            min="0"
          />
        </div>
        {question.questionReference.s3Key && (
          <div className="text-xs text-gray-500 truncate">S3 Key: {question.questionReference.s3Key}</div>
        )}
      </div>

      {/* Reference Display */}
      {(question.questionReference.s3Key || question.questionReference.text) && (
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
                page: question.questionReference.page,
                referenceType: question.questionReference.referenceType === 'table' 
                  ? 'table' 
                  : question.questionReference.referenceType === 'passage'
                  ? 'text'
                  : 'image',
                externalKey: question.questionReference.s3Key,
                boundingBox: question.questionReference.boundingBox || [],
                text: question.questionReference.text,
              }}
            />
          </div>
        </div>
      )}

      {/* Bounding Box Editor - Only show for image references */}
      {editedBoundingBox.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Bounding Box [x_min, y_min, x_max, y_max]</Label>
          <div className="grid grid-cols-4 gap-2">
            {editedBoundingBox.map((value, index) => (
              <Input
                key={index}
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => handleBoundingBoxChange(index, e.target.value)}
                className="text-xs"
                placeholder={['y_min', 'x_min', 'y_max', 'x_max'][index]}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {/* Recrop button */}
            {onRecrop && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecrop}
                className="flex-1"
                disabled={isRecropping || editedBoundingBox.length !== 4}
              >
                {isRecropping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recropping...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Recrop with New Bounding Box
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

