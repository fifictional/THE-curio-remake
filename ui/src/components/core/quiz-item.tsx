"use client";

import { cn } from "@/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";
import { ReferenceViewer } from "./reference-viewer";
import { CurioMarkdown } from "./curio-markdown";

export interface QuizItem {
  questionContent: string;
  documentUuid: string | null;
  questionReferences: {
    reference_type?: string;
    reference_name?: string;
    reference_content?: string;
    reference_url?: string;
  }[];
  options: string[];
  answer: number;
}

interface QuizItemProps {
  quiz: QuizItem;
  onAnswerSelected: (idx: number) => void;
  selectedAnswer: number;
  isAnswered: boolean;
}

export function QuizItem({ quiz, onAnswerSelected, selectedAnswer = -1, isAnswered = false }: QuizItemProps) {    
  // Filter references to show all visual references (figures, tables, and other visual elements)
  const visualReferences = quiz.questionReferences?.filter(ref => 
    ref.reference_type === 'visual-element' && 
    ref.reference_name?.toUpperCase().includes('FIGURE')
  ) || [];
  
  const tableReferences = quiz.questionReferences?.filter(ref => 
    (ref.reference_type === 'table' || ref.reference_type === 'text') && 
    ref.reference_name?.toUpperCase().includes('TABLE')
  ) || [];

  const textReferences = quiz.questionReferences?.filter(ref => 
    ref.reference_type === 'text' && !ref.reference_name?.toUpperCase().includes('TABLE')
  ) || [];

  return (
    <div className="w-full">
      <div className="mb-2 text-base text-gray-900 bg-white rounded-xl shadow p-4 py-3">
        {/* Question Content */}
        <div className="text-gray-700">
          <CurioMarkdown content={quiz.questionContent} />
        </div>
        
        {/* Show visual references if available */}
        {visualReferences.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-gray-500 font-medium">References:</div>
            <div className="flex justify-center">
                {visualReferences.map((ref, index) => {
                  console.log('QuizItem: Rendering reference:', ref, 'at index:', index);
                  return (
                    <ReferenceViewer
                      key={index}
                      referenceType={ref.reference_type}
                      referenceName={ref.reference_name}
                      className="w-full"
                    />
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Show table references if available */}
        {tableReferences.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-gray-500 font-medium">Table References:</div>
            <div className="space-y-2">
              {tableReferences.map((ref, index) => {
                return (
                  <div key={`table-${index}`} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    {ref.reference_name && (
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {ref.reference_name}
                      </div>
                    )}
                    {ref.reference_content && (
                      <div className="text-sm text-gray-600">
                        <CurioMarkdown content={ref.reference_content} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Quiz Options */}
      <div className="flex flex-col gap-3 p-2" data-testid="quiz-options">
        {quiz.options.map((option, aIdx) => (
          <label
            key={`${option}-${aIdx}`}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors justify-between w-full bg-gray-100 border border-gray-200",
              isAnswered ? "border-gray-200" : "hover:border-primary/30",
              selectedAnswer === aIdx && "border-primary/80")}
            onClick={() => {
              if (!isAnswered) {
                onAnswerSelected(aIdx);
              }
            }}
            data-testid={`quiz-option-${aIdx}`}
          >
            <span className='text-gray-500'>
              <CurioMarkdown content={option} />
            </span>
            {isAnswered && (
              <span className='text-gray-500'>
                {aIdx === quiz.answer ? <CheckIcon className="w-5 h-5 text-green-500" /> : <XIcon className="w-5 h-5 text-red-500" />}
              </span>
            )}
          </label>
        ))}
      </div>

    </div>
  );
} 