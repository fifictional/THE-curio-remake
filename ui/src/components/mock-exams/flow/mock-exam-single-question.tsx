"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { QuestionReferenceImage } from '@/components/ui/question-reference-image';
import { MockExamQuizOptions } from './mock-exam-quiz-options';
import { cn } from '@/lib/utils';

export interface SingleQuestionProps {
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  questionReference?: Array<{
    referenceType: string;
    externalKey?: string;
    text?: string;
  }>;
  onAnswer?: (selectedIndex: number, isCorrect: boolean) => void;
  onNext?: () => void;
  initialSelected?: number | null;
  initialHasChecked?: boolean;
  showQuestionNumber?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
  isMobile?: boolean;
  nextUnansweredIndex?: number | null
}

export function MockExamSingleQuestion({
  questionContent,
  options,
  correctAnswer,
  hint,
  answerExplanations,
  questionReference,
  onAnswer,
  onNext,
  initialSelected = null,
  initialHasChecked = false,
  showQuestionNumber = true,
  questionNumber,
  totalQuestions,
  isMobile = false,
  nextUnansweredIndex = null
}: SingleQuestionProps) {
  const [selected, setSelected] = useState<number | null>(initialSelected);
  const [hasChecked, setHasChecked] = useState(initialHasChecked);
  const [showHint, setShowHint] = useState(false);

  // Reset state when question changes (detected by questionContent change)
  useEffect(() => {
    setSelected(initialSelected);
    setHasChecked(initialHasChecked);
    setShowHint(false);
  }, [questionContent, initialSelected, initialHasChecked]);

  const isCorrect = selected !== null && selected === correctAnswer;

  const handleCheck = () => {
    if (selected === null) return;
    setHasChecked(true);
    const correct = selected === correctAnswer;
    onAnswer?.(selected, correct);
  };

  const handleNext = () => {
    onNext?.();
  };

  const handleSelect = (index: number) => {
    if (!hasChecked) {
      setSelected(index);
    }
  };

  const buttonText = useMemo(() => {
    if (hasChecked) {
      if (onNext) {
        'Next';
      }
      return 'Continue'
    } else {
      return 'Submit answer'
    }
  }, [hasChecked, onNext, nextUnansweredIndex])

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        {/* Question Reference Image */}
        {questionReference && questionReference.length > 0 && (
          <div className="w-full mx-auto flex justify-center mb-4">
            <QuestionReferenceImage
              reference={{
                page: 0,
                referenceType: questionReference[0].referenceType as 'table' | 'image' | 'text',
                externalKey: questionReference[0].externalKey,
                boundingBox: [],
                text: questionReference[0].text,
              }}
            />
          </div>
        )}

        {/* Question Content */}
        <div className="text-lg font-medium mb-3">
          <CurioMarkdown content={questionContent} />
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gray-200 my-8" />

        {/* Options */}
        <MockExamQuizOptions
          options={options}
          selected={selected ?? -1}
          correctAnswer={correctAnswer}
          hasChecked={hasChecked}
          onSelect={handleSelect}
        />
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-muted-foreground">
        </div>
        <div className="flex items-center gap-2">
          {hint && !hasChecked && (
            <Button
              variant="outline"
              onClick={() => setShowHint((v) => !v)}
              size="sm"
              className="flex-shrink-0"
            >
              {showHint ? 'Hide hint' : 'Hint'}
            </Button>
          )}
          <Button
            onClick={hasChecked ? handleNext : handleCheck}
            disabled={!hasChecked && selected === null}
            size="sm"
            className="flex-shrink-0"
          >
            {buttonText}
          </Button>
        </div>
      </div>

      {/* Hint */}
      <AnimatePresence>
        {hint && showHint && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-3 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm"
          >
            <CurioMarkdown content={hint} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <AnimatePresence>
        {hasChecked && answerExplanations && answerExplanations.length > 0 && selected !== null && answerExplanations[selected] && (
          <motion.div
            key="explanation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-3 text-sm"
          >
            <div className={cn(
              "mt-2 border border-gray-200 rounded-md p-2",
              isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            )}>
              <CurioMarkdown content={answerExplanations[selected]} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

