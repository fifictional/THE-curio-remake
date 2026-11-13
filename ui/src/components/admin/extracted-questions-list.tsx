'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { FileText } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';

interface ExtractedQuestionsListProps {
  questions: ExtractedQuestion[];
}

export function ExtractedQuestionsList({ questions }: ExtractedQuestionsListProps) {
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Questions Extracted</h3>
          <p className="text-muted-foreground">
            No questions were found in the uploaded file.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Questions ({questions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            {/* Question Number */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Question {index + 1}
                </Badge>
                <Badge 
                  variant={question.questionType === 'MULTIPLE_CHOICE' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {question.questionType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Text Input'}
                </Badge>
              </div>
              {question.questionReference && question.questionReference.referenceType !== 'none' && (
                <Badge variant="secondary" className="text-xs">
                  {question.questionReference.referenceType} (Page {question.questionReference.page})
                </Badge>
              )}
            </div>

            {/* Question Content */}
            <div>
              <h4 className="font-medium mb-2 text-sm text-gray-600">Question:</h4>
              <div className="text-sm">
                <CurioMarkdown content={question.questionContent} />
              </div>
            </div>

            {/* Options */}
            {question.questionType === 'MULTIPLE_CHOICE' && question.questionOptions && question.questionOptions.length > 0 ? (
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-600">Options:</h4>
                <div className="space-y-2">
                  {question.questionOptions.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="text-sm p-2 rounded bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-500 shrink-0">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <div className="flex-1">
                          <CurioMarkdown content={option} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : question.questionType === 'TEXT_INPUT' && (
              <div>
                <h4 className="font-medium mb-2 text-sm text-gray-600">Answer Type:</h4>
                <div className="text-sm p-2 rounded bg-blue-50 border border-blue-200 text-blue-700">
                  Student will enter a text answer
                </div>
              </div>
            )}

            {/* Reference Info */}
            {question.questionReference && question.questionReference.referenceType !== 'none' && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                <div className="font-medium mb-1">Reference Information:</div>
                <div>Type: {question.questionReference.referenceType}</div>
                <div>Page: {question.questionReference.page}</div>
                <div>
                  Bounding Box: [{question.questionReference.boundingBox.map(n => n.toFixed(2)).join(', ')}]
                </div>
                {question.questionReference.s3Key && (
                  <div>S3 Key: {question.questionReference.s3Key}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

