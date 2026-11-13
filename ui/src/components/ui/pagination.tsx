import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentIndex: number;
  total: number;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  testIdPrefix?: string; // Prefix for test IDs (e.g., "flashcard-", "quiz-")
}

export function Pagination({ currentIndex, total, onNext, onPrevious, canGoPrevious = true, canGoNext = true, testIdPrefix = '' }: PaginationProps) {
  const prefix = testIdPrefix ? `${testIdPrefix}-` : '';
  return (
    <div className="flex items-center justify-between mt-4 px-2" data-testid={`${prefix}pagination`}>
      <Button
        className="rounded-full bg-gray-100 hover:bg-gray-200 p-2"
        size="icon"
        variant="outline"
        onClick={onPrevious}
        disabled={total <= 1 || !canGoPrevious}
        data-testid={`${prefix}pagination-previous`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm text-gray-500" data-testid={`${prefix}pagination-info`}>
        {currentIndex + 1} of {total}
      </div>
      <Button
        className={`rounded-full bg-gray-100 hover:bg-gray-200 p-2`}
        size="icon"
        variant="outline"
        onClick={onNext}
        disabled={total <= 1 || !canGoNext}
        data-testid={`${prefix}pagination-next`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
} 