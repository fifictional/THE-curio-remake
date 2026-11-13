'use client';

import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useQuestionExtractorJob } from '@/hooks/use-question-extractor-job';
import { useExamModulesApi } from '@/hooks/api/exam-modules/use-exam-modules.api';
import { CompactQuestionsList } from '@/components/admin/compact-questions-list';
import { QuestionEditPanel } from '@/components/admin/question-edit-panel';
import { QuestionExtractorJobStatus } from '@/components/admin/question-extractor-job-status';
import { AnswerKeyUpload } from '@/components/admin/answer-key-upload';
import { ModulesEditor } from '@/components/admin/modules-editor';
import { AnswerModulesEditor } from '@/components/admin/answer-modules-editor';

interface PageProps {
  params: Promise<{
    jobUuid: string;
  }>;
}

export default function QuestionExtractorJobPage({ params }: PageProps) {
  const { jobUuid } = use(params);
  const { examModules } = useExamModulesApi();
  
  const {
    currentJob,
    extractedQuestions,
    isLoadingQuestions,
    isExtractingReferences,
    extractingReferenceUuids,
    selectedQuestions,
    editingQuestion,
    isUploadingAnswerKey,
    isStartingExtraction,
    isReExtractingModules,
    isExtractingAnswers,
    isReExtractingAnswerModules,
    handleSelectAll,
    handleSelectQuestion,
    handleVerifyAll,
    handleVerifyQuestion,
    handleEditQuestion,
    handleSaveQuestion,
    handleExtractSelectedReferences,
    handleExtractQuestionReference,
    handleRecropQuestionReference,
    handleUploadAnswerKey,
    handleBackToList,
    handleCloseEditPanel,
    handleStartQuestionExtraction,
    handleReExtractModules,
    handleExtractAnswers,
    handleReExtractAnswerModules,
    handleBulkAssignModule,
  } = useQuestionExtractorJob(jobUuid);

  if (!currentJob) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading job...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={handleBackToList}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold mb-2">Extraction Job</h1>
          <p className="text-muted-foreground">{currentJob.fileName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Job Status Card */}
        <QuestionExtractorJobStatus job={currentJob} />

        {/* Modules Editor - shown after modules are extracted */}
        {currentJob.status === 'MODULES_EXTRACTED' && currentJob.identifiedModules && (
          <ModulesEditor
            modulesJson={currentJob.identifiedModules}
            onStartExtraction={handleStartQuestionExtraction}
            onReExtractModules={handleReExtractModules}
            isStarting={isStartingExtraction}
            isReExtracting={isReExtractingModules}
          />
        )}

        {/* Answer Key Upload - shown when questions are extracted */}
        {(currentJob.status === 'COMPLETED' || currentJob.status === 'QUESTION_EXTRACTED') && (
          <>
            <AnswerKeyUpload
              job={currentJob}
              onUpload={handleUploadAnswerKey}
              isUploading={isUploadingAnswerKey}
            />

            {/* Answer Modules Editor - shown after answer modules are extracted */}
            {currentJob.answerKeyStatus === 'ANSWER_MODULES_EXTRACTED' && currentJob.identifiedAnswerModules && (
              <AnswerModulesEditor
                modulesJson={currentJob.identifiedAnswerModules}
                onExtractAnswers={handleExtractAnswers}
                onReExtractModules={handleReExtractAnswerModules}
                isExtracting={isExtractingAnswers}
                isReExtracting={isReExtractingAnswerModules}
              />
            )}
          </>
        )}

        {/* Extracted Questions */}
        {(currentJob.status === 'COMPLETED' || currentJob.status === 'QUESTION_EXTRACTED') && (
          <>
            {isLoadingQuestions ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading questions...</p>
                </CardContent>
              </Card>
            ) : (
              <CompactQuestionsList
                questions={extractedQuestions}
                selectedQuestions={selectedQuestions}
                examModules={examModules?.map(m => ({
                  examModuleUuid: m.examModuleUuid,
                  moduleName: m.moduleName
                }))}
                isExtractingReferences={isExtractingReferences}
                extractingReferenceUuids={extractingReferenceUuids}
                onSelectAll={handleSelectAll}
                onSelectQuestion={handleSelectQuestion}
                onVerifyAll={handleVerifyAll}
                onVerifyQuestion={handleVerifyQuestion}
                onEditQuestion={handleEditQuestion}
                onExtractReference={handleExtractQuestionReference}
                onExtractSelectedReferences={handleExtractSelectedReferences}
                onBulkAssignModule={handleBulkAssignModule}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Panel */}
      <QuestionEditPanel
        question={editingQuestion}
        isOpen={!!editingQuestion}
        examModules={examModules?.map(m => ({
          examModuleUuid: m.examModuleUuid,
          moduleName: m.moduleName
        }))}
        onClose={handleCloseEditPanel}
        onSave={handleSaveQuestion}
        onRecrop={handleRecropQuestionReference}
        onExtractReference={handleExtractQuestionReference}
      />
    </div>
  );
}

