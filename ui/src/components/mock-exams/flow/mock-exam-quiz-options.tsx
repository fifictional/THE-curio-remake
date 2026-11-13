"use client";

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { useCommonContext } from '@/providers';

interface MockExamQuizOptionProps {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  hasChecked: boolean;
  onSelect: () => void;
  displayType: 'row' | 'grid';
}

function MockExamQuizOption({
  option,
  index,
  isSelected,
  isCorrect,
  isWrong,
  hasChecked,
  onSelect,
  displayType
}: MockExamQuizOptionProps) {
  const baseClasses = "relative text-left rounded-md border px-4 py-3 pr-9 transition-colors duration-300 ease-in-out cursor-pointer";
  
  const getOptionClasses = () => {
    if (hasChecked) {
      if (isCorrect) return 'border-green-500 bg-green-50';
      if (isWrong) return 'border-red-500 bg-red-50';
      return 'border-border';
    }
    
    if (isSelected) return 'border-gray-800 bg-gray-800/5';
    return 'border-gray-300 hover:bg-gray-600/5 hover:border-gray-600';
  };

  const getAnimationProps = () => {
    if (hasChecked) {
      if (isCorrect) {
        return {
          scale: isSelected ? 1.03 : 1,
          y: -2
        };
      }
      if (isWrong) {
        return {
          scale: 1.03,
          opacity: 0.95
        };
      }
      return { scale: 1, y: 0 };
    }
    
    return {
      scale: isSelected ? 1.01 : 1
    };
  };

  const textSizeClass = displayType === 'grid' ? '!text-xl' : '!text-lg';

  return (
    <motion.button
      onClick={hasChecked ? undefined : onSelect}
      className={`${baseClasses} ${getOptionClasses()} ${hasChecked ? 'pointer-events-none' : ''} ${textSizeClass}`}
      layout
      initial={false}
      animate={getAnimationProps()}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <CurioMarkdown content={option} />
      {hasChecked && (isCorrect || isWrong) && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          {isCorrect ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <X className="h-5 w-5 text-red-600" />
          )}
        </motion.span>
      )}
    </motion.button>
  );
}

interface MockExamQuizOptionsProps {
  options: string[];
  selected: number | null;
  correctAnswer: number;
  hasChecked: boolean;
  onSelect: (index: number) => void;
}

export function MockExamQuizOptions({
  options,
  selected,
  correctAnswer,
  hasChecked,
  onSelect
}: MockExamQuizOptionsProps) {
  const { isMobile } = useCommonContext();
  // Determine display type based on option length
  const getDisplayType = (): 'row' | 'grid' => {
    if (isMobile) return 'row';
    const avgLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
    return avgLength > 30 ? 'row' : 'grid';
  };

  const displayType = getDisplayType();

  const containerClasses = displayType === 'grid' 
    ? "grid grid-cols-2 gap-3"
    : "flex flex-col gap-3";

  return (
    <div className={containerClasses}>
      {options.map((option, index) => (
        <MockExamQuizOption
          key={index}
          option={option}
          index={index}
          isSelected={selected === index}
          isCorrect={index === correctAnswer}
          isWrong={selected === index && selected !== correctAnswer}
          hasChecked={hasChecked}
          onSelect={() => onSelect(index)}
          displayType={displayType}
        />
      ))}
    </div>
  );
}