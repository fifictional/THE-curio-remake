'use client';

import { useCallback, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { ExamPaperQuestion } from "@/lib/types/mock-exam";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const editQuestionSchema = z.object({
  questionContent: z.string().min(1, "Question content is required"),
  questionOptions: z.array(z.string()).min(1, "At least one option is required"),
  questionHint: z.string().optional(),
  questionAnswerExplanations: z.array(z.string()).optional(),
});

type EditQuestionFormData = z.infer<typeof editQuestionSchema>;

interface EditQuestionModalProps {
  isOpen: boolean;
  question: ExamPaperQuestion | null;
  onClose: () => void;
  onSave: (data: {
    questionUuid: string;
    questionContent: string;
    questionOptions: string[];
    questionHint?: string;
    questionAnswerExplanations?: string[];
  }) => Promise<void>;
  isSaving: boolean;
}

function EditQuestionModalComponent({
  isOpen,
  question,
  onClose,
  onSave,
  isSaving,
}: EditQuestionModalProps) {
  // Early return to avoid rendering form when modal is closed
  if (!isOpen || !question) return null;

  return <EditQuestionForm 
    question={question}
    onClose={onClose}
    onSave={onSave}
    isSaving={isSaving}
  />;
}

interface EditQuestionFormProps {
  question: ExamPaperQuestion;
  onClose: () => void;
  onSave: (data: {
    questionUuid: string;
    questionContent: string;
    questionOptions: string[];
    questionHint?: string;
    questionAnswerExplanations?: string[];
  }) => Promise<void>;
  isSaving: boolean;
}

function EditQuestionForm({
  question,
  onClose,
  onSave,
  isSaving,
}: EditQuestionFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditQuestionFormData>({
    resolver: zodResolver(editQuestionSchema),
    defaultValues: {
      questionContent: question.questionContent,
      questionOptions: question.questionOptions || [],
      questionHint: question.questionHint || '',
      questionAnswerExplanations: question.questionAnswerExplanations || [],
    },
  });

  const onSubmit = useCallback(async (data: EditQuestionFormData) => {
    await onSave({
      questionUuid: question.examPaperQuestionUuid,
      questionContent: data.questionContent,
      questionOptions: data.questionOptions,
      questionHint: data.questionHint || undefined,
      questionAnswerExplanations: data.questionAnswerExplanations && data.questionAnswerExplanations.length > 0 
        ? data.questionAnswerExplanations 
        : undefined,
    });
  }, [question.examPaperQuestionUuid, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Edit Question</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update the question content, options, hint, and explanations. The first option is always the correct answer.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Question Content */}
            <div className="space-y-2">
              <label htmlFor="questionContent" className="text-sm font-medium">
                Question Content *
              </label>
              <Textarea
                id="questionContent"
                {...register('questionContent')}
                rows={4}
                placeholder="Enter the question content..."
                className="resize-none"
              />
              {errors.questionContent && (
                <p className="text-sm text-red-600">{errors.questionContent.message}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Options * (First option is the correct answer)
              </label>
              {watch('questionOptions')?.map((_, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? "default" : "outline"} className="shrink-0">
                      {index === 0 ? "Correct" : `Option ${index + 1}`}
                    </Badge>
                    <Textarea
                      {...register(`questionOptions.${index}`)}
                      rows={2}
                      placeholder={`Option ${index + 1}...`}
                      className="resize-none flex-1"
                    />
                    {watch('questionOptions').length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const options = watch('questionOptions');
                          setValue('questionOptions', options.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {errors.questionOptions?.[index] && (
                    <p className="text-sm text-red-600 ml-20">
                      {errors.questionOptions[index]?.message}
                    </p>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const options = watch('questionOptions') || [];
                  setValue('questionOptions', [...options, '']);
                }}
              >
                Add Option
              </Button>
            </div>

            {/* Hint */}
            <div className="space-y-2">
              <label htmlFor="questionHint" className="text-sm font-medium">
                Hint (Optional)
              </label>
              <Textarea
                id="questionHint"
                {...register('questionHint')}
                rows={2}
                placeholder="Enter a hint for the question..."
                className="resize-none"
              />
            </div>

            {/* Answer Explanations */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Answer Explanations (Optional)
              </label>
              {(watch('questionAnswerExplanations') || []).map((_, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">
                      Explanation {index + 1}
                    </Badge>
                    <Textarea
                      {...register(`questionAnswerExplanations.${index}`)}
                      rows={3}
                      placeholder={`Explanation ${index + 1}...`}
                      className="resize-none flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const explanations = watch('questionAnswerExplanations') || [];
                        setValue('questionAnswerExplanations', explanations.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const explanations = watch('questionAnswerExplanations') || [];
                  setValue('questionAnswerExplanations', [...explanations, '']);
                }}
              >
                Add Explanation
              </Button>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const EditQuestionModal = memo(EditQuestionModalComponent);

