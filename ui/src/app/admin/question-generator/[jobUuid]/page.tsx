"use client";

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { CompactQuestionsList } from '@/components/admin/compact-questions-list';
import { QuestionEditPanel } from '@/components/admin/question-edit-panel';
import { useQuestionGeneratorJob } from '@/hooks/use-question-generator-job';
import { useExamModulesApi } from '@/hooks/api/exam-modules/use-exam-modules.api';

interface PageProps {
  params: Promise<{ jobUuid: string }>;
}

export default function QuestionGeneratorJobPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { jobUuid } = resolvedParams;
  const { examModules } = useExamModulesApi();

  const {
    currentJob,
    generatedQuestions,
    isLoadingQuestions,
    selectedQuestions,
    editingQuestion,
    isVerifying,
    generatingReferenceUuids,
    generatingAnswerUuids,
    handleSelectAll,
    handleSelectQuestion,
    handleVerifyAll,
    handleVerifyQuestion,
    handleEditQuestion,
    handleSaveQuestion,
    handleCloseEditPanel,
    handleGenerateReference,
    handleGenerateAnswer,
  } = useQuestionGeneratorJob(jobUuid);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'GENERATING_QUESTIONS':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating Questions</Badge>;
      case 'GENERATING_REFERENCES':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700"><Zap className="w-3 h-3 mr-1" />Generating References</Badge>;
      case 'GENERATING_ANSWERS':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-700"><Zap className="w-3 h-3 mr-1" />Generating Answers</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!currentJob) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/question-generator">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Generator
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Question Generation Job</h1>
            <p className="text-gray-600">{currentJob.prompt}</p>
          </div>
          <div>
            {getStatusBadge(currentJob.status)}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Job ID</p>
              <p className="text-sm font-mono">{currentJob.questionGenerationJobUuid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-sm">{currentJob.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Questions</p>
              <p className="text-sm">{currentJob.totalQuestions ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-sm">{new Date(currentJob.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Generation Logs */}
          {currentJob.generationLogs && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Generation Progress</p>
              <div className="bg-gray-50 border rounded p-3 max-h-60 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {currentJob.generationLogs}
                </pre>
              </div>
            </div>
          )}

          {/* Error Message */}
          {currentJob.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-700 mb-1">Error</p>
              <p className="text-sm text-red-600">{currentJob.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Questions</CardTitle>
          <CardDescription>
            {isLoadingQuestions ? 'Loading questions...' : `${generatedQuestions.length} questions generated`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQuestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : generatedQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No questions generated yet.</p>
            </div>
          ) : (
            <CompactQuestionsList
              questions={generatedQuestions}
              selectedQuestions={selectedQuestions}
              onSelectAll={handleSelectAll}
              onSelectQuestion={handleSelectQuestion}
              onVerifyAll={handleVerifyAll}
              onVerifyQuestion={handleVerifyQuestion}
              onEditQuestion={handleEditQuestion}
              extractingReferenceUuids={new Set()}
              generatingReferenceUuids={generatingReferenceUuids}
              generatingAnswerUuids={generatingAnswerUuids}
              onGenerateReference={handleGenerateReference}
              onGenerateAnswer={handleGenerateAnswer}
            />
          )}
        </CardContent>
      </Card>

      {/* Question Edit Panel */}
      <QuestionEditPanel
        question={editingQuestion}
        isOpen={!!editingQuestion}
        examModules={examModules?.map(m => ({
          examModuleUuid: m.examModuleUuid,
          moduleName: m.moduleName
        }))}
        onClose={handleCloseEditPanel}
        onSave={handleSaveQuestion}
        onGenerateReference={handleGenerateReference}
        onGenerateAnswer={handleGenerateAnswer}
        isGenerating={editingQuestion ? generatingReferenceUuids.has(editingQuestion.extractedQuestionUuid) : false}
        isGeneratingAnswer={editingQuestion ? generatingAnswerUuids.has(editingQuestion.extractedQuestionUuid) : false}
      />
    </div>
  );
}

