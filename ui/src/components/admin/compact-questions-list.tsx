'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Image as ImageIcon, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { QuestionListItem } from './question-list-item';

interface ExamModule {
  examModuleUuid: string;
  moduleName: string;
}

interface CompactQuestionsListProps {
  questions: ExtractedQuestion[];
  selectedQuestions: Set<string>;
  examModules?: ExamModule[];
  isExtractingReferences?: boolean;
  extractingReferenceUuids?: Set<string>;
  generatingReferenceUuids?: Set<string>;
  generatingAnswerUuids?: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectQuestion: (questionUuid: string, checked: boolean) => void;
  onVerifyAll: () => void;
  onVerifyQuestion: (questionUuid: string, currentlyVerified: boolean) => void;
  onEditQuestion: (question: ExtractedQuestion) => void;
  onExtractReference?: (questionUuid: string) => void;
  onGenerateReference?: (questionUuid: string) => void;
  onGenerateAnswer?: (questionUuid: string) => void;
  onExtractSelectedReferences?: () => void;
  onBulkAssignModule?: (questionUuids: string[], examModuleUuid: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 20;

export function CompactQuestionsList({
  questions,
  selectedQuestions,
  examModules,
  isExtractingReferences = false,
  extractingReferenceUuids = new Set(),
  generatingReferenceUuids = new Set(),
  generatingAnswerUuids = new Set(),
  onSelectAll,
  onSelectQuestion,
  onVerifyAll,
  onVerifyQuestion,
  onEditQuestion,
  onExtractReference,
  onGenerateReference,
  onGenerateAnswer,
  onExtractSelectedReferences,
  onBulkAssignModule,
}: CompactQuestionsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [showVerified, setShowVerified] = useState(false);
  const [selectedModuleForBulk, setSelectedModuleForBulk] = useState<string>('');
  const [isAssigningModule, setIsAssigningModule] = useState(false);

  // Get unique module numbers and subjects
  const { moduleNumbers, subjects } = useMemo(() => {
    const modules = new Set<number>();
    const subjs = new Set<string>();
    questions.forEach(q => {
      modules.add(q.moduleNumber);
      subjs.add(q.module);
    });
    return {
      moduleNumbers: Array.from(modules).sort((a, b) => a - b),
      subjects: Array.from(subjs).sort(),
    };
  }, [questions]);

  // Filter and paginate questions
  const { filteredQuestions, totalPages } = useMemo(() => {
    let filtered = questions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.questionContent.toLowerCase().includes(query) ||
        `m${q.moduleNumber}-q${q.questionNumber}`.toLowerCase().includes(query)
      );
    }

    // Apply module filter
    if (moduleFilter !== 'all') {
      filtered = filtered.filter(q => q.moduleNumber === parseInt(moduleFilter));
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(q => q.module === subjectFilter);
    }

    // Apply verified filter
    if (showVerified) {
      filtered = filtered.filter(q => q.verified === true);
    }

    const totalPgs = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    return {
      filteredQuestions: filtered,
      totalPages: totalPgs,
    };
  }, [questions, searchQuery, moduleFilter, subjectFilter, showVerified]);

  // Get current page questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIndex, endIndex);
  }, [filteredQuestions, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, moduleFilter, subjectFilter]);

  const allSelected = paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.has(q.extractedQuestionUuid));
  const someSelected = paginatedQuestions.some(q => selectedQuestions.has(q.extractedQuestionUuid)) && !allSelected;

  const handleSelectAllOnPage = (checked: boolean) => {
    paginatedQuestions.forEach(q => {
      onSelectQuestion(q.extractedQuestionUuid, checked);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Extracted Questions ({filteredQuestions.length} of {questions.length})</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAllOnPage}
                  className={someSelected ? 'data-[state=checked]:bg-gray-400' : ''}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select Page
                </label>
              </div>
              {onExtractSelectedReferences && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExtractSelectedReferences}
                  disabled={selectedQuestions.size === 0 || isExtractingReferences}
                >
                  {isExtractingReferences ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Extract Refs ({selectedQuestions.size})
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                onClick={onVerifyAll}
                disabled={selectedQuestions.size === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify All ({selectedQuestions.size})
              </Button>
              {onBulkAssignModule && examModules && examModules.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModuleForBulk}
                    onChange={(e) => setSelectedModuleForBulk(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                    disabled={selectedQuestions.size === 0 || isAssigningModule}
                  >
                    <option value="">Assign Module...</option>
                    {examModules.map((module) => (
                      <option key={module.examModuleUuid} value={module.examModuleUuid}>
                        {module.moduleName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!selectedModuleForBulk || selectedQuestions.size === 0) return;
                      setIsAssigningModule(true);
                      try {
                        await onBulkAssignModule(Array.from(selectedQuestions), selectedModuleForBulk);
                        setSelectedModuleForBulk('');
                      } finally {
                        setIsAssigningModule(false);
                      }
                    }}
                    disabled={!selectedModuleForBulk || selectedQuestions.size === 0 || isAssigningModule}
                  >
                    {isAssigningModule ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      `Assign to ${selectedQuestions.size}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            {/* Search */}
            <div className="space-y-1">
              <Label htmlFor="search" className="text-xs">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by content or M1-Q5..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Module Filter */}
            <div className="space-y-1">
              <Label htmlFor="module-filter" className="text-xs">Filter by Module</Label>
              <select
                id="module-filter"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Modules</option>
                {moduleNumbers.map(num => (
                  <option key={num} value={num.toString()}>Module {num}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="space-y-1">
              <Label htmlFor="subject-filter" className="text-xs">Filter by Subject</Label>
              <select
                id="subject-filter"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Verified Filter */}
            <div className="space-y-1">
              <Label className="text-xs">Filter Options</Label>
              <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md">
                <Checkbox
                  id="show-verified"
                  checked={showVerified}
                  onCheckedChange={(checked) => setShowVerified(checked as boolean)}
                />
                <label
                  htmlFor="show-verified"
                  className="text-sm font-medium cursor-pointer"
                >
                  Show Verified Only
                </label>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || moduleFilter !== 'all' || subjectFilter !== 'all' || showVerified) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Active filters:</span>
              {searchQuery && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Search: "{searchQuery}"</span>}
              {moduleFilter !== 'all' && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Module {moduleFilter}</span>}
              {subjectFilter !== 'all' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{subjectFilter}</span>}
              {showVerified && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">Verified Only</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setModuleFilter('all');
                  setSubjectFilter('all');
                  setShowVerified(false);
                }}
                className="h-6 px-2"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Question List */}
          {paginatedQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No questions found matching your filters.</p>
              {(searchQuery || moduleFilter !== 'all' || subjectFilter !== 'all' || showVerified) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setModuleFilter('all');
                    setSubjectFilter('all');
                    setShowVerified(false);
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedQuestions.map((question) => (
                <QuestionListItem
                  key={question.extractedQuestionUuid}
                  question={question}
                  examModules={examModules}
                  isSelected={selectedQuestions.has(question.extractedQuestionUuid)}
                  isExtracting={extractingReferenceUuids.has(question.extractedQuestionUuid)}
                  isGenerating={generatingReferenceUuids.has(question.extractedQuestionUuid)}
                  isGeneratingAnswer={generatingAnswerUuids.has(question.extractedQuestionUuid)}
                  onSelect={(checked) => onSelectQuestion(question.extractedQuestionUuid, checked)}
                  onVerify={() => onVerifyQuestion(question.extractedQuestionUuid, question.verified || false)}
                  onEdit={() => onEditQuestion(question)}
                  onExtractReference={
                    onExtractReference
                      ? () => onExtractReference(question.extractedQuestionUuid)
                      : undefined
                  }
                  onGenerateReference={
                    onGenerateReference
                      ? () => onGenerateReference(question.extractedQuestionUuid)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)} of {filteredQuestions.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-9"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


