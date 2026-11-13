import { useState, useCallback } from 'react';
import { useQuestionGeneratorJobApi } from '@/hooks/api/question-generator/use-question-generator-job.api';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { useQuestionVerification } from '@/hooks/api/question-extractor';
import { useGenerateQuestionReference } from '@/hooks/api/question-generator/use-generate-question-reference.api';
import { useGenerateQuestionAnswer } from '@/hooks/api/question-generator/use-generate-question-answer.api';
import { useQuestionExtractorApi } from '@/hooks/api/question-extractor/use-question-extractor.api';

export function useQuestionGeneratorJob(jobUuid: string) {
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<ExtractedQuestion | null>(null);
  const [generatingReferenceUuids, setGeneratingReferenceUuids] = useState<Set<string>>(new Set());
  const [generatingAnswerUuids, setGeneratingAnswerUuids] = useState<Set<string>>(new Set());
  
  const { currentJob, generatedQuestions, isLoadingQuestions, refetchQuestions } = useQuestionGeneratorJobApi(jobUuid);
  const { verifyQuestions, isVerifying } = useQuestionVerification();
  const { generateReference, isGenerating } = useGenerateQuestionReference();
  const { generateAnswer } = useGenerateQuestionAnswer();
  // Use question extractor API for updateQuestion function (jobUuid not needed for updates)
  const { updateQuestion } = useQuestionExtractorApi(null);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedQuestions(new Set(generatedQuestions.map(q => q.extractedQuestionUuid)));
    } else {
      setSelectedQuestions(new Set());
    }
  }, [generatedQuestions]);

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
    
    const questionsToProcess = questionUuids.map(uuid => 
      generatedQuestions.find(q => q.extractedQuestionUuid === uuid)
    ).filter(q => q !== undefined);
    
    const allVerified = questionsToProcess.every(q => q.verified);
    
    const success = await verifyQuestions(questionUuids, !allVerified);
    if (success) {
      // Refetch questions to get updated verification status
      await refetchQuestions?.();
    }
    setSelectedQuestions(new Set());
  }, [selectedQuestions, generatedQuestions, verifyQuestions, refetchQuestions]);

  const handleVerifyQuestion = useCallback(async (questionUuid: string, currentlyVerified: boolean) => {
    const success = await verifyQuestions([questionUuid], !currentlyVerified);
    if (success) {
      // Refetch questions to get updated verification status
      await refetchQuestions?.();
    }
  }, [verifyQuestions, refetchQuestions]);

  const handleEditQuestion = useCallback((question: ExtractedQuestion) => {
    setEditingQuestion(question);
  }, []);

  const handleSaveQuestion = useCallback(async (updatedQuestion: ExtractedQuestion) => {
    try {
      await updateQuestion(updatedQuestion);
      setEditingQuestion(null);
      // Refetch questions to get updated data
      await refetchQuestions?.();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question. Please try again.');
    }
  }, [updateQuestion, refetchQuestions]);

  const handleCloseEditPanel = useCallback(() => {
    setEditingQuestion(null);
  }, []);

  const handleGenerateReference = useCallback(async (questionUuid: string) => {
    setGeneratingReferenceUuids(prev => new Set(prev).add(questionUuid));
    try {
      const success = await generateReference(questionUuid);
      if (success) {
        // Refetch questions to get updated status
        await refetchQuestions?.();
      }
    } finally {
      setGeneratingReferenceUuids(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionUuid);
        return newSet;
      });
    }
  }, [generateReference, refetchQuestions]);

  const handleGenerateAnswer = useCallback(async (questionUuid: string) => {
    setGeneratingAnswerUuids(prev => new Set(prev).add(questionUuid));
    try {
      const success = await generateAnswer(questionUuid);
      if (success) {
        // Refetch questions to get updated status
        await refetchQuestions?.();
      }
    } finally {
      setGeneratingAnswerUuids(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionUuid);
        return newSet;
      });
    }
  }, [generateAnswer, refetchQuestions]);

  return {
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
  };
}

