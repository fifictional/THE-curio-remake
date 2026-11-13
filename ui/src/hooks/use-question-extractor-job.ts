import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionExtractorApi, ExtractedQuestion, useAnswerKeyUploadApi, useQuestionVerification } from '@/hooks/api/question-extractor';

export function useQuestionExtractorJob(jobUuid: string) {
  const router = useRouter();
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<ExtractedQuestion | null>(null);
  const [isUploadingAnswerKey, setIsUploadingAnswerKey] = useState(false);
  const [isStartingExtraction, setIsStartingExtraction] = useState(false);
  const [isReExtractingModules, setIsReExtractingModules] = useState(false);
  const [isExtractingAnswers, setIsExtractingAnswers] = useState(false);
  const [isReExtractingAnswerModules, setIsReExtractingAnswerModules] = useState(false);
  
  const { currentJob, extractedQuestions, isLoadingQuestions, isExtractingReferences, extractingReferenceUuids, extractReferences, recropReference, isUploading, updateQuestion, startQuestionExtraction, reExtractModules, startAnswerExtraction, reExtractAnswerModules } = useQuestionExtractorApi(jobUuid);
  const { uploadAnswerKey } = useAnswerKeyUploadApi();
  const { verifyQuestions, isVerifying } = useQuestionVerification();

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedQuestions(new Set(extractedQuestions.map(q => q.extractedQuestionUuid)));
    } else {
      setSelectedQuestions(new Set());
    }
  }, [extractedQuestions]);

  const handleSelectQuestion = useCallback((questionUuid: string, checked: boolean) => {
    setSelectedQuestions(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(questionUuid);
      } else {
        newSelected.delete(questionUuid);
      }
      return newSelected;
    });
  }, []);

  const handleVerifyAll = useCallback(async () => {
    const questionUuids = Array.from(selectedQuestions);
    if (questionUuids.length === 0) {
      alert('Please select questions to verify');
      return;
    }
    
    // Check if any selected questions are already verified
    const questionsToProcess = questionUuids.map(uuid => 
      extractedQuestions.find(q => q.extractedQuestionUuid === uuid)
    ).filter(q => q !== undefined);
    
    const hasVerified = questionsToProcess.some(q => q?.verified);
    const hasUnverified = questionsToProcess.some(q => !q?.verified);
    
    // If mixed, ask user what to do
    if (hasVerified && hasUnverified) {
      const shouldVerify = confirm('Some questions are already verified. Do you want to verify all (OK) or unverify all (Cancel)?');
      await verifyQuestions(questionUuids, shouldVerify);
    } else if (hasVerified) {
      // All are verified, unverify them
      await verifyQuestions(questionUuids, false);
    } else {
      // All are unverified, verify them
      await verifyQuestions(questionUuids, true);
    }
    
    // Clear selection after successful verification
    setSelectedQuestions(new Set());
  }, [selectedQuestions, extractedQuestions, verifyQuestions]);

  const handleVerifyQuestion = useCallback(async (questionUuid: string, currentlyVerified: boolean) => {
    // Toggle verification status
    await verifyQuestions([questionUuid], !currentlyVerified);
  }, [verifyQuestions]);

  const handleEditQuestion = useCallback((question: ExtractedQuestion) => {
    setEditingQuestion(question);
  }, []);

  const handleSaveQuestion = useCallback(async (updatedQuestion: ExtractedQuestion) => {
    try {
      await updateQuestion(updatedQuestion);
      setEditingQuestion(null);
      // The subscription will automatically update the UI
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question. Please try again.');
    }
  }, [updateQuestion]);

  const handleExtractSelectedReferences = useCallback(async () => {
    const selectedUuids = Array.from(selectedQuestions);
    if (selectedUuids.length > 0) {
      await extractReferences(selectedUuids);
    }
  }, [extractReferences, selectedQuestions]);

  const handleExtractQuestionReference = useCallback(async (questionUuid: string) => {
    await extractReferences([questionUuid]);
  }, [extractReferences]);

  const handleBackToList = useCallback(() => {
    router.push('/admin/question-extractor');
  }, [router]);

  const handleCloseEditPanel = useCallback(() => {
    setEditingQuestion(null);
  }, []);

  const handleRecropQuestionReference = useCallback(async (questionUuid: string, referenceType: 'image' | 'graph' | 'chart' | 'table' | 'passage', page: number, boundingBox: number[]) => {
    return await recropReference(questionUuid, referenceType, page, boundingBox);
  }, [recropReference]);

  const handleUploadAnswerKey = useCallback(async (file: File) => {
    if (!currentJob) return false;
    
    setIsUploadingAnswerKey(true);
    try {
      return await uploadAnswerKey(currentJob, file);
    } finally {
      setIsUploadingAnswerKey(false);
    }
  }, [currentJob, uploadAnswerKey]);

  const handleStartQuestionExtraction = useCallback(async (modules: any[]) => {
    setIsStartingExtraction(true);
    try {
      const success = await startQuestionExtraction(modules);
      return success;
    } finally {
      setIsStartingExtraction(false);
    }
  }, [startQuestionExtraction]);

  const handleReExtractModules = useCallback(async () => {
    setIsReExtractingModules(true);
    try {
      const success = await reExtractModules();
      return success;
    } finally {
      setIsReExtractingModules(false);
    }
  }, [reExtractModules]);

  const handleExtractAnswers = useCallback(async (modules: any[]) => {
    setIsExtractingAnswers(true);
    try {
      const success = await startAnswerExtraction(modules);
      return success;
    } finally {
      setIsExtractingAnswers(false);
    }
  }, [startAnswerExtraction]);

  const handleReExtractAnswerModules = useCallback(async () => {
    setIsReExtractingAnswerModules(true);
    try {
      const success = await reExtractAnswerModules();
      return success;
    } finally {
      setIsReExtractingAnswerModules(false);
    }
  }, [reExtractAnswerModules]);

  const handleBulkAssignModule = useCallback(async (questionUuids: string[], examModuleUuid: string) => {
    try {
      // Update all selected questions with the exam module UUID
      await Promise.all(
        questionUuids.map(uuid => {
          const question = extractedQuestions.find(q => q.extractedQuestionUuid === uuid);
          if (question) {
            return updateQuestion({
              ...question,
              examModuleUuid: examModuleUuid,
            });
          }
          return Promise.resolve();
        })
      );
      
      // Clear selection after successful assignment
      setSelectedQuestions(new Set());
    } catch (error) {
      console.error('Error bulk assigning module:', error);
      alert('Failed to assign module to selected questions');
    }
  }, [extractedQuestions, updateQuestion]);

  return {
    // State
    currentJob,
    extractedQuestions,
    isLoadingQuestions,
    isExtractingReferences,
    extractingReferenceUuids,
    selectedQuestions,
    editingQuestion,
    isUploading,
    isUploadingAnswerKey,
    isVerifying,
    isStartingExtraction,
    isReExtractingModules,
    isExtractingAnswers,
    isReExtractingAnswerModules,
    
    // Handlers
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
  };
}

