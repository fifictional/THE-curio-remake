'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface QuestionAnswerEditorProps {
  questionType: 'MULTIPLE_CHOICE' | 'TEXT_INPUT';
  correctAnswer: string;
  onCorrectAnswerChange: (value: string) => void;
  options: string[];
  onOptionChange: (index: number, value: string) => void;
  answerExplanations: string[];
  onAnswerExplanationChange: (index: number, value: string) => void;
}

export function QuestionAnswerEditor({
  questionType,
  correctAnswer,
  onCorrectAnswerChange,
  options,
  onOptionChange,
  answerExplanations,
  onAnswerExplanationChange,
}: QuestionAnswerEditorProps) {
  return (
    <>
      {/* Correct Answer Selection */}
      <div>
        <Label className="text-base font-semibold mb-3">Correct Answer</Label>
        {questionType === 'MULTIPLE_CHOICE' ? (
          <div className="mt-2">
            <select
              value={correctAnswer}
              onChange={(e) => onCorrectAnswerChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Select correct answer...</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        ) : (
          <div className="mt-2">
            <Input
              value={correctAnswer}
              onChange={(e) => onCorrectAnswerChange(e.target.value)}
              placeholder="Enter the correct answer..."
              className="font-mono text-sm"
            />
          </div>
        )}
      </div>

      {/* Options (only for multiple choice) */}
      {questionType === 'MULTIPLE_CHOICE' && (
        <div>
          <Label className="text-base font-semibold mb-3">Answer Options</Label>
          <TabsRoot defaultValue="0" className="mt-3">
            <TabsList className="w-full border-b border-gray-200 rounded-none bg-gray-50 h-12">
              {options.map((_, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                const isCorrect = correctAnswer?.toUpperCase() === optionLetter;
                return (
                  <TabsTrigger
                    key={index}
                    value={index.toString()}
                    className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      Option {optionLetter}
                      {isCorrect && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index);
              const isCorrect = correctAnswer?.toUpperCase() === optionLetter;
              
              return (
                <TabsContent key={index} value={index.toString()} className="mt-4">
                  <div className="border rounded-lg p-4 space-y-3">
                    <div>
                      <Label htmlFor={`option-${index}`} className="text-sm text-gray-600 flex items-center gap-2">
                        Option {optionLetter}
                        {isCorrect && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            ✓ Correct
                          </Badge>
                        )}
                      </Label>
                      <Textarea
                        id={`option-${index}`}
                        value={option}
                        onChange={(e) => onOptionChange(index, e.target.value)}
                        rows={2}
                        className="mt-1 font-mono text-sm"
                        placeholder={`Enter option ${optionLetter}...`}
                      />
                      <div className="mt-2 p-3 border rounded bg-gray-50">
                        <p className="text-xs font-medium text-gray-600 mb-1">Preview:</p>
                        <CurioMarkdown content={option} />
                      </div>
                    </div>
                    
                    {/* Editable explanation for this option */}
                    <div>
                      <Label htmlFor={`explanation-${index}`} className="text-xs text-gray-600">
                        {isCorrect ? 'Correct Answer Explanation' : `Explanation for ${optionLetter}`}
                      </Label>
                      <Textarea
                        id={`explanation-${index}`}
                        value={answerExplanations[index] || ''}
                        onChange={(e) => onAnswerExplanationChange(index, e.target.value)}
                        rows={2}
                        className="mt-1 text-xs"
                        placeholder={isCorrect ? "Explain why this is the correct answer..." : "Explain why this answer is incorrect..."}
                      />
                    </div>
                    <div className="mt-2 p-3 border rounded bg-gray-50">
                      <p className="text-xs font-medium text-gray-600 mb-1">Preview:</p>
                      <CurioMarkdown content={answerExplanations[index] || ''} />
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </TabsRoot>
        </div>
      )}

      {/* Answer Explanation (for text input questions) */}
      {questionType === 'TEXT_INPUT' && (
        <>
          <div>
            <Label htmlFor="answer-explanation" className="text-base font-semibold">
              Answer Explanation
            </Label>
            <Textarea
              id="answer-explanation"
              value={answerExplanations[0] || ''}
              onChange={(e) => onAnswerExplanationChange(0, e.target.value)}
              rows={3}
              className="mt-2 text-sm"
              placeholder="Explain the correct answer..."
            />
          </div>
          <div className="mt-2 p-3 border rounded bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-1">Preview:</p>
            <CurioMarkdown content={answerExplanations[0] || ''} />
          </div>
        </>
      )}
    </>
  );
}

