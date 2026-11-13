import { Button } from "@/components/ui/button";
import { CurioMarkdown } from "@/components/core/curio-markdown";
import { useCallback, useState } from "react";
import { MessageToolExtra } from "@/lib/types";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import useChatGenerateQuizApi from "@/hooks/api/quizzes/use-chat-generate-quiz.api";
import { useSessionContext } from "@/providers/session-provider";

interface CreateQuizArgs {
  quiz?: {
    quiz: {
      title?: string;
      description?: string;
      questionCount?: number;
      difficulty?: string;
    };
  };
  chatUuid: string; 
  messageUuid: string;
  toolExtras?: MessageToolExtra;
}

export function CreateQuizCard({ messageUuid, chatUuid, quiz, toolExtras }: CreateQuizArgs) {
  const info = quiz?.quiz || {};
  const [isLoading, setIsLoading] = useState(false);
  const { userAttributes } = useSessionContext();

  const { generateQuiz } = useChatGenerateQuizApi();

  const isToolLoading = !!toolExtras?.isLoading;
  const isSuccess = !!toolExtras?.success;
  const hasErrors = !!(toolExtras?.errors && toolExtras.errors.length > 0);

  const handleGenerateQuiz = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    await generateQuiz({
      messageUuid,
      userUuid: userAttributes?.userUuid || '',
      sourceUuid: chatUuid,
      sourceType: 'chat',
      quiz: {
        title: info.title || '',
        description: info.description || '',
        difficulty: info.difficulty || '',
        questionCount: info.questionCount || 0,
      },
    });
    setIsLoading(false);
  }, [generateQuiz, toolExtras, info, chatUuid, messageUuid, userAttributes]);

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full" data-testid="create-quiz-card">
      <div className="rounded-lg border bg-focus text-card-foreground shadow p-4 max-w-md w-full">
        {info.title && <div className="text-lg font-semibold mb-1" data-testid="quiz-title">{info.title}</div>}
        <div className="flex flex-col flex-wrap text-sm text-muted-foreground mb-3" data-testid="quiz-info">
          {info.difficulty && <div data-testid="quiz-difficulty">Difficulty: {info.difficulty}</div>}
          {typeof info.questionCount === 'number' && <div data-testid="quiz-question-count">{info.questionCount} questions</div>}
        </div>
        {info.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-3" data-testid="quiz-description">
            <CurioMarkdown content={info.description} />
          </div>
        )}
        {hasErrors && (
          <div className="text-sm text-red-600" data-testid="quiz-error">{toolExtras?.errors?.[0]}</div>
        )}
        <div className="flex justify-end mt-2">
          {isSuccess && !hasErrors ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
              data-testid="quiz-generated-success"
            >
              <Check className="h-5 w-5 text-emerald-600" aria-label="Ready" />
            </motion.div>
          ) : (
            <Button onClick={handleGenerateQuiz} disabled={isToolLoading || isLoading} data-testid="generate-quiz-button">
              {isToolLoading || isLoading ? 'Preparing…' : 'Generate quiz'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
