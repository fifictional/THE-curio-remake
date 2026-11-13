'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { GeneratedReferences } from './generated-references';
import { ExtractedReferences } from './extracted-references';
import { QuestionMetadataEditor } from './question-metadata-editor';
import { QuestionContentEditor } from './question-content-editor';
import { QuestionEditPanelHeader } from './question-edit-panel-header';
import { QuestionAnswerEditor } from './question-answer-editor';
import { QuestionEditPanelFooter } from './question-edit-panel-footer';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ExamModule {
  examModuleUuid: string;
  moduleName: string;
}

interface QuestionEditPanelProps {
  question: ExtractedQuestion | null;
  isOpen: boolean;
  examModules?: ExamModule[];
  onClose: () => void;
  onSave: (question: ExtractedQuestion) => Promise<void>;
  onRecrop?: (questionUuid: string, referenceType: 'image' | 'graph' | 'chart' | 'table' | 'passage', page: number, boundingBox: number[]) => Promise<boolean>;
  onExtractReference?: (questionUuid: string) => Promise<void>;
  onGenerateReference?: (questionUuid: string) => Promise<void>;
  onGenerateAnswer?: (questionUuid: string) => Promise<void>;
  isExtracting?: boolean;
  isGenerating?: boolean;
  isGeneratingAnswer?: boolean;
}

export function QuestionEditPanel({
  question,
  isOpen,
  examModules,
  onClose,
  onSave,
  onRecrop,
  onExtractReference,
  onGenerateReference,
  onGenerateAnswer,
  isExtracting = false,
  isGenerating = false,
  isGeneratingAnswer = false,
}: QuestionEditPanelProps) {
  const [editedContent, setEditedContent] = useState('');
  const [editedOptions, setEditedOptions] = useState<string[]>([]);
  const [editedModule, setEditedModule] = useState('');
  const [editedTopic, setEditedTopic] = useState('');
  const [editedSubtopic, setEditedSubtopic] = useState('');
  const [editedConcept, setEditedConcept] = useState('');
  const [editedDifficulty, setEditedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | ''>('');
  const [editedExamModuleUuid, setEditedExamModuleUuid] = useState('');
  const [editedBoundingBox, setEditedBoundingBox] = useState<number[]>([]);
  const [editedCorrectAnswer, setEditedCorrectAnswer] = useState('');
  const [editedAnswerExplanations, setEditedAnswerExplanations] = useState<string[]>(['', '', '', '']);
  const [editedHint, setEditedHint] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRecropping, setIsRecropping] = useState(false);
  const [shouldDeleteReference, setShouldDeleteReference] = useState(false);
  const [editedReferencePage, setEditedReferencePage] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (question) {
      setEditedContent(question.questionContent);
      setEditedOptions(question.questionOptions || []);
      setEditedModule(question.module || '');
      setEditedTopic(question.topic || '');
      setEditedSubtopic(question.subtopic || '');
      setEditedConcept(question.concept || '');
      setEditedDifficulty(question.difficulty || '');
      setEditedExamModuleUuid(question.examModuleUuid || '');
      setEditedCorrectAnswer(question.correctAnswer || '');
      setEditedAnswerExplanations(question.answerExplanations || ['', '', '', '']);
      setEditedHint(question.hint || '');
      setShouldDeleteReference(false);
    }
  }, [question]);

  const handleSave = async () => {
    if (!question) return;

    setIsSaving(true);
    try {
      const payload: any = {
        ...question,
        questionContent: editedContent,
        questionOptions: editedOptions,
        module: editedModule,
        topic: editedTopic,
        subtopic: editedSubtopic,
        concept: editedConcept,
        difficulty: editedDifficulty || undefined,
        examModuleUuid: editedExamModuleUuid || undefined,
        correctAnswer: editedCorrectAnswer || undefined,
        answerExplanations: editedAnswerExplanations.some(exp => exp.trim() !== '') ? editedAnswerExplanations : undefined,
        hint: editedHint || undefined,
        questionReference: shouldDeleteReference ? null : (question.questionReference ? {
          referenceType: question.questionReference.referenceType || 'none',
          page: question.questionReference.page ?? 0,
          boundingBox: question.questionReference.boundingBox ?? [],
          s3Key: question.questionReference.s3Key ?? null,
          text: question.questionReference.text ?? null,
        } : null),
        referenceExtractionStatus: shouldDeleteReference ? null : question.referenceExtractionStatus,
        referenceExtractionError: shouldDeleteReference ? null : question.referenceExtractionError,
      };

      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editedOptions];
    newOptions[index] = value;
    setEditedOptions(newOptions);
  };

  const handleAnswerExplanationChange = (index: number, value: string) => {
    const newExplanations = [...editedAnswerExplanations];
    newExplanations[index] = value;
    setEditedAnswerExplanations(newExplanations);
  };

  const handleDeleteReference = () => {
    if (confirm('Are you sure you want to delete the reference from this question? This will not delete the image file, only remove the reference from the question.')) {
      setShouldDeleteReference(true);
    }
  };

  // Generate evaluation prompt text
  const evaluationPrompt = useMemo(() => {
    if (!question) return '';

    let prompt = `Please evaluate the following question for correctness, clarity, and appropriateness:\n\n`;
    
    // Question content
    prompt += `QUESTION:\n${editedContent || question.questionContent}\n\n`;
    
    // Options (if multiple choice)
    if (editedOptions.length > 0 || (question.questionOptions && question.questionOptions.length > 0)) {
      const options = editedOptions.length > 0 ? editedOptions : (question.questionOptions || []);
      prompt += `OPTIONS:\n`;
      options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        const isCorrect = editedCorrectAnswer === letter || editedCorrectAnswer === String(index) || 
                         question.correctAnswer === letter || question.correctAnswer === String(index);
        prompt += `${letter}. ${option}${isCorrect ? ' ✓ (Correct Answer)' : ''}\n`;
      });
      prompt += `\n`;
    }
    
    // Correct answer
    if (editedCorrectAnswer || question.correctAnswer) {
      prompt += `CORRECT ANSWER: ${editedCorrectAnswer || question.correctAnswer}\n\n`;
    }
    
    // Answer explanations
    const explanations = editedAnswerExplanations.some(exp => exp.trim() !== '') 
      ? editedAnswerExplanations 
      : (question.answerExplanations || []);
    if (explanations.some(exp => exp && exp.trim() !== '')) {
      prompt += `ANSWER EXPLANATIONS:\n`;
      explanations.forEach((explanation, index) => {
        if (explanation && explanation.trim() !== '') {
          const letter = String.fromCharCode(65 + index);
          prompt += `${letter}. ${explanation}\n`;
        }
      });
      prompt += `\n`;
    }
    
    // Hint
    if (editedHint || question.hint) {
      prompt += `HINT: ${editedHint || question.hint}\n\n`;
    }
    
    // Metadata
    prompt += `METADATA:\n`;
    if (editedModule || question.module) {
      prompt += `Module: ${editedModule || question.module}\n`;
    }
    if (editedTopic || question.topic) {
      prompt += `Topic: ${editedTopic || question.topic}\n`;
    }
    if (editedSubtopic || question.subtopic) {
      prompt += `Subtopic: ${editedSubtopic || question.subtopic}\n`;
    }
    if (editedConcept || question.concept) {
      prompt += `Concept: ${editedConcept || question.concept}\n`;
    }
    if (editedDifficulty || question.difficulty) {
      prompt += `Difficulty: ${editedDifficulty || question.difficulty}\n`;
    }
    
    prompt += `\nPlease provide a score on a scale of 1 to 5 for:\n`;
    prompt += `1. Clarity and Unambiguity (1-5)\n`;
    prompt += `2. Appropriateness of Answer Options (1-5)\n`;
    prompt += `3. Correctness of the Correct Answer (1-5)\n`;
    prompt += `4. Accuracy of Answer Explanations (1-5)\n`;
    prompt += `5. Overall Question Quality (1-5)\n`;
    prompt += `6. If a reference image is provided, how well does it match the question? (1-5)\n`;
    
    return prompt;
  }, [question, editedContent, editedOptions, editedCorrectAnswer, editedAnswerExplanations, editedHint, editedModule, editedTopic, editedSubtopic, editedConcept, editedDifficulty]);

  const handleCopyEvaluationPrompt = async () => {
    try {
      await navigator.clipboard.writeText(evaluationPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!question) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-20 right-0 h-[calc(100vh-80px)] w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <QuestionEditPanelHeader
            questionType={question.questionType}
            extractedQuestionUuid={question.extractedQuestionUuid}
            onClose={onClose}
          />

          {/* Tabs */}
          <TabsRoot defaultValue="meta" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full border-b border-gray-200 rounded-none bg-gray-50 h-12">
              <TabsTrigger value="meta" className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900">
                Meta
              </TabsTrigger>
              <TabsTrigger value="question" className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900">
                Question
              </TabsTrigger>
              <TabsTrigger value="answers" className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900">
                Answers
              </TabsTrigger>
              <TabsTrigger value="reference" className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900">
                Reference
              </TabsTrigger>
              <TabsTrigger value="eval" className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gray-900">
                Eval
              </TabsTrigger>
            </TabsList>

            {/* Meta Tab */}
            <TabsContent value="meta" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <QuestionMetadataEditor
                module={editedModule}
                setModule={setEditedModule}
                difficulty={editedDifficulty}
                setDifficulty={setEditedDifficulty}
                examModuleUuid={editedExamModuleUuid}
                setExamModuleUuid={setEditedExamModuleUuid}
                topic={editedTopic}
                setTopic={setEditedTopic}
                subtopic={editedSubtopic}
                setSubtopic={setEditedSubtopic}
                concept={editedConcept}
                setConcept={setEditedConcept}
                examModules={examModules}
              />

              {/* Generate Answer Button (for generated questions without answers) */}
              {question.isGenerated && 
               !question.correctAnswer && 
               !question.hint && 
               (!question.answerExplanations || question.answerExplanations.length === 0 || question.answerExplanations.every(exp => !exp)) &&
               onGenerateAnswer && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onGenerateAnswer(question.extractedQuestionUuid)}
                    disabled={isGeneratingAnswer}
                    className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                  >
                    {isGeneratingAnswer ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Answer...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Answer
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Question Tab */}
            <TabsContent value="question" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <QuestionContentEditor
                content={editedContent}
                onChange={setEditedContent}
              />

              {/* Hint */}
              <div>
                <Label htmlFor="hint" className="text-base font-semibold">
                  💡 Hint
                </Label>
                <Textarea
                  id="hint"
                  value={editedHint}
                  onChange={(e) => setEditedHint(e.target.value)}
                  rows={2}
                  className="mt-2 text-sm"
                  placeholder="Provide a hint to help solve the question..."
                />
              </div>
            </TabsContent>

            {/* Answers Tab */}
            <TabsContent value="answers" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <QuestionAnswerEditor
                questionType={question.questionType}
                correctAnswer={editedCorrectAnswer}
                onCorrectAnswerChange={setEditedCorrectAnswer}
                options={editedOptions}
                onOptionChange={handleOptionChange}
                answerExplanations={editedAnswerExplanations}
                onAnswerExplanationChange={handleAnswerExplanationChange}
              />
            </TabsContent>

            {/* Reference Tab */}
            <TabsContent value="reference" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              {question.isGenerated ? (
                <GeneratedReferences
                  question={question}
                  isGenerating={isGenerating}
                  onGenerateReference={onGenerateReference}
                  onSave={onSave}
                />
              ) : (
                <ExtractedReferences
                  question={question}
                  isExtracting={isExtracting}
                  isRecropping={isRecropping}
                  onExtractReference={onExtractReference}
                  onRecrop={onRecrop}
                  onDeleteReference={handleDeleteReference}
                  onSave={onSave}
                />
              )}
            </TabsContent>

            {/* Eval Tab */}
            <TabsContent value="eval" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Evaluation Prompt
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyEvaluationPrompt}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={evaluationPrompt}
                  readOnly
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Evaluation prompt will appear here..."
                />
                <p className="text-xs text-gray-500">
                  This prompt includes the question, options, correct answer, explanations, and metadata. 
                  Copy it and paste into ChatGPT or another AI to evaluate the question quality.
                </p>
              </div>
            </TabsContent>
          </TabsRoot>

          {/* Footer */}
          <QuestionEditPanelFooter
            isSaving={isSaving}
            onClose={onClose}
            onSave={handleSave}
          />
        </div>
      </div>
    </>
  );
}

