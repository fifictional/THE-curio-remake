'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DocumentPagination({
  currentPage,
  totalPages,
  onPageChange,
}: DocumentPaginationProps) {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 1}
        className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{currentPage}</span>
        <span className="text-sm text-gray-500">of</span>
        <span className="text-sm font-medium">{totalPages}</span>
      </div>
      <button
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
} 