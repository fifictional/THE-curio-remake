'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface QuestionEditPanelHeaderProps {
  questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
  extractedQuestionUuid: string;
  onClose: () => void;
}

export function QuestionEditPanelHeader({
  questionType,
  extractedQuestionUuid,
  onClose,
}: QuestionEditPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between p-2 px-6 border-b gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h2 className="text-2xl font-semibold truncate">Edit Question</h2>
        <Badge
          variant={questionType === 'MULTIPLE_CHOICE' ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Text Input'}
        </Badge>
      </div>
      
      {/* Question ID and Close Button */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded border whitespace-nowrap">
          ID: <span className="font-semibold">{extractedQuestionUuid || 'N/A'}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

