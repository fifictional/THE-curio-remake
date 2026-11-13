'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CurioMarkdown } from '@/components/core/curio-markdown';

interface QuestionContentEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export function QuestionContentEditor({
  content,
  onChange,
}: QuestionContentEditorProps) {
  return (
    <div>
      <Label htmlFor="question-content" className="text-base font-semibold mb-2">
        Question Content
      </Label>
      <Textarea
        id="question-content"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-2 font-mono text-sm"
        placeholder="Enter question content..."
      />
      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
        <p className="text-xs font-medium text-gray-600 mb-2">Preview:</p>
        <CurioMarkdown content={content} />
      </div>
    </div>
  );
}

