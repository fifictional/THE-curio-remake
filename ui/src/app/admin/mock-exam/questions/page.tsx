'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionReferenceImage } from "@/components/ui/question-reference-image";
import { CurioMarkdown } from "@/components/core/curio-markdown";
import { ArrowLeft, BookOpen, Calendar, XCircle, Loader2, FileText, Hash, CheckCircle, Shield, ShieldCheck, Pencil } from "lucide-react";
import { ToolButton } from "@/components/ui/tool-button";
import { ExamPaper, ExamPaperQuestion } from "@/lib/types/mock-exam";
import { useMockExamPapersApi } from "@/hooks/api/mock-documents";
import { EditQuestionModal } from "@/components/admin/edit-question-modal";

const getQuestionTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'multiple-choice':
      return 'bg-blue-100 text-blue-800';
    case 'short-answer':
      return 'bg-green-100 text-green-800';
    case 'fill-in-the-blank':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ExamPaperQuestionsPage() {
  const router = useRouter();
  const [selectedExamIndex, setSelectedExamIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<ExamPaperQuestion | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { examPapers, isLoading, error: fetchError, refetch: fetchExamPapers, updateQuestionVerification, isUpdatingVerification, updateQuestion, isUpdatingQuestion } = useMockExamPapersApi();

  useEffect(() => {
    if (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch exam papers');
    }
  }, [fetchError]);

  useEffect(() => {
    // If there are exam papers, select the first one by default
    if (examPapers && examPapers.length > 0 && !selectedExamIndex) {
      setSelectedExamIndex(0);
    }
  }, [examPapers, selectedExamIndex]);

  const handleVerificationToggle = useCallback(async (questionUuid: string, currentVerified: boolean) => {
    // Fire and forget - optimistic update handles the UI immediately
    await updateQuestionVerification({ questionUuid, verified: !currentVerified })
  }, [updateQuestionVerification]);

  const handleEditQuestion = useCallback((question: ExamPaperQuestion) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingQuestion(null);
  }, []);

  const handleSaveQuestion = useCallback(async (data: {
    questionUuid: string;
    questionContent: string;
    questionOptions: string[];
    questionHint?: string;
    questionAnswerExplanations?: string[];
  }) => {
    await updateQuestion(data);
    handleCloseEditModal();
  }, [updateQuestion, handleCloseEditModal]);

  if (isLoading) {
    return (
      <div className="container p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading exam papers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-8">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Exam Papers</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchExamPapers()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Mock Exam Generator
          </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fetchExamPapers()}
                    disabled={isLoading}
                  >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
        <h1 className="text-2xl font-semibold">Exam Paper Questions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage questions from processed exam papers
        </p>
      </div>

      {examPapers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Exam Papers Found</h3>
            <p className="text-muted-foreground mb-4">
              No exam papers have been processed yet. Generate some exam papers first.
            </p>
            <Button onClick={() => router.push('/admin/mock-exam')}>
              Go to Exam Paper Generator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exam List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Exam Papers</CardTitle>
                <CardDescription>
                  Select an exam paper to view its questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {examPapers.map((exam, index) => (
                  <div
                    key={exam.examPaperUuid}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedExamIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedExamIndex(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{exam.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {exam.totalQuestions} questions
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(exam.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Paper {exam.paperIndex + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-2">
            {selectedExamIndex !== null ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{examPapers[selectedExamIndex].title}</CardTitle>
                      <CardDescription>
                        {examPapers[selectedExamIndex].totalQuestions} questions • Created {formatDate(examPapers[selectedExamIndex].createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      Paper {examPapers[selectedExamIndex].paperIndex + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {examPapers[selectedExamIndex].questions && examPapers[selectedExamIndex].questions.length > 0 ? (
                    examPapers[selectedExamIndex].questions.map((question, index) => (
                    <div key={question.examPaperQuestionUuid} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Q{question.questionNumber}
                          </Badge>
                          <Badge className={`text-xs ${getQuestionTypeColor(question.questionType)}`}>
                            {question.questionType}
                          </Badge>
                          {question.moduleName && (
                            <Badge variant="secondary" className="text-xs">
                              {question.moduleName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">
                              {question.verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                          <ToolButton
                            icon={Pencil}
                            label="Edit Question"
                            onClick={() => handleEditQuestion(question)}
                            disabled={false}
                          />
                          <ToolButton
                            icon={question.verified ? ShieldCheck : Shield}
                            label={question.verified ? 'Unverify Question' : 'Verify Question'}
                            onClick={() => {
                              handleVerificationToggle(question.examPaperQuestionUuid, question.verified);
                            }}
                            disabled={false}
                            isActive={question.verified}
                          />
                        </div>
                      </div>

                      {/* Question Metadata */}
                      {(question.questionExamName || question.questionExamSubject || question.questionTopic) && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {question.questionExamName && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <BookOpen className="w-3 h-3 mr-1" />
                                {question.questionExamName}
                              </Badge>
                            )}
                            {question.questionExamSubject && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <FileText className="w-3 h-3 mr-1" />
                                {question.questionExamSubject}
                              </Badge>
                            )}
                            {question.questionTopic && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                <Hash className="w-3 h-3 mr-1" />
                                {question.questionTopic}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                       <div className="mb-4">
                         <h4 className="font-medium mb-2">Question:</h4>
                         <div className="text-sm text-gray-700">
                           <CurioMarkdown content={question.questionContent} />
                         </div>
                       </div>

                       {question.questionOptions && question.questionOptions.length > 0 && (
                         <div className="mb-4">
                           <h4 className="font-medium mb-2">Options:</h4>
                           <div className="space-y-1">
                             {question.questionOptions.map((option, optionIndex) => (
                               <div
                                 key={optionIndex}
                                 className={`text-sm p-2 rounded ${
                                   option === question.questionOptions[0]
                                     ? 'bg-green-100 text-green-800 border border-green-200'
                                     : 'bg-gray-50 text-gray-700'
                                 }`}
                               >
                                 <div className="flex items-start">
                                   <div className="flex-1">
                                     <CurioMarkdown content={option} />
                                   </div>
                                   {option === question.questionOptions[0] && (
                                     <CheckCircle className="inline w-4 h-4 ml-2 text-green-600 flex-shrink-0" />
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       <div className="mb-4">
                         <h4 className="font-medium mb-2">Correct Answer:</h4>
                         <div className="text-sm text-green-700 font-medium">
                           <CurioMarkdown content={question.questionOptions[0]} />
                         </div>
                       </div>

                       {question.questionAnswerExplanations && (
                         <div className="mb-4">
                           <h4 className="font-medium mb-2">Explanation:</h4>
                           <div className="text-sm text-gray-700">
                             <CurioMarkdown content={question.questionAnswerExplanations[0]} />
                           </div>
                         </div>
                       )}

                       {question.questionHint && (
                         <div className="mb-4">
                           <h4 className="font-medium mb-2">Hint:</h4>
                           <div className="text-sm text-gray-700">
                             <CurioMarkdown content={question.questionHint} />
                           </div>
                         </div>
                       )}

                      {question.questionReference && 
                       Array.isArray(question.questionReference) && 
                       question.questionReference.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-3 text-gray-800">Reference Images:</h4>
                          {(() => {
                            console.log('Question references for question', question.questionNumber, ':', question.questionReference);
                            const referencesWithKeys = question.questionReference.filter(ref => ref.externalKey);
                            const referencesWithoutKeys = question.questionReference.filter(ref => !ref.externalKey);
                            
                            return (
                              <>
                                {referencesWithKeys.map((ref, index) => {
                                  console.log('Rendering QuestionReferenceImage with ref:', ref);
                                  return (
                                    <QuestionReferenceImage
                                      key={`with-key-${index}`}
                                      reference={ref}
                                    />
                                  );
                                })}
                                {referencesWithoutKeys.map((ref, index) => {
                                  console.log('Rendering QuestionReferenceImage without externalKey:', ref);
                                  return (
                                    <QuestionReferenceImage
                                      key={`without-key-${index}`}
                                      reference={ref}
                                    />
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No questions found for this exam paper.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Questions: {examPapers[selectedExamIndex].questions?.length || 0}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select an Exam</h3>
                  <p className="text-muted-foreground">
                    Choose a mock exam from the list to view its questions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      <EditQuestionModal
        isOpen={isEditModalOpen}
        question={editingQuestion}
        onClose={handleCloseEditModal}
        onSave={handleSaveQuestion}
        isSaving={isUpdatingQuestion}
      />
    </div>
  );
}