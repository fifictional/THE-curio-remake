import { Button } from "@/components/ui/button";
import { CurioMarkdown } from "@/components/core/curio-markdown";
import { useCallback, useState } from "react";
import { MessageToolExtra } from "@/lib/types/message";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useSessionContext } from "@/providers/session-provider";
import { useCreateMockExamApi } from "@/hooks/api/mock-exams/use-create-mock-exam.api";
import { useAnalytics } from "@/providers";
interface CreateMockExamArgs {
  mockExam?: {
    mockExam: {
      title?: string;
      description?: string;
      topic?: string;
      difficulty?: string;
      time?: number;
      instructions?: string;
      questionCount?: number;
      moduleUuids?: string[];
    },
  },
  chatUuid: string | null,
  messageUuid: string,
  toolExtras?: MessageToolExtra;
}

export function CreateMockExamCard({ mockExam, chatUuid, messageUuid, toolExtras }: CreateMockExamArgs) {
  const info = mockExam?.mockExam || {};
  const { userAttributes } = useSessionContext();
  const [apiLoading, setApiLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { track } = useAnalytics();

  const { createMockExam } = useCreateMockExamApi();

  const handleCreateMockExam = useCallback(async () => {
    if (toolExtras?.userAction) {
      return;
    }
    if (!chatUuid) {
      setLocalError('This chat is not ready yet. Please try again in a moment.');
      return;
    }

    // Only the fields used by the backend route are strictly required; the rest
    // get safe defaults so a partial tool-call payload never results in a
    // silently-dead button.
    if (!info.title || !info.topic || !info.questionCount) {
      setLocalError('Test details are incomplete. Please ask Curio to regenerate the test.');
      return;
    }

    setLocalError(null);

    track('mock-exam-created-from-chat', {
      title: info.title,
      description: info.description || '',
      topic: info.topic,
      difficulty: info.difficulty || '',
      time: info.time || 0,
      questionCount: info.questionCount,
    });

    setApiLoading(true);

    try {
      const mockExamCreationResponse = await createMockExam({
        userUuid: userAttributes?.userUuid || '',
        messageUuid,
        title: info.title,
        description: info.description || '',
        topic: info.topic,
        difficulty: info.difficulty || '',
        time: info.time || 0,
        questionCount: info.questionCount,
        chatUuid,
        instructions: info.instructions || '',
        moduleUuids: info.moduleUuids || [],
      });

      if (!mockExamCreationResponse?.success) {
        setLocalError(mockExamCreationResponse?.error || 'Failed to create practice test.');
        return;
      }

      return mockExamCreationResponse;
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create practice test.');
    } finally {
      setApiLoading(false);
    }
  }, [createMockExam, userAttributes, info, chatUuid, messageUuid, toolExtras, track]);

  const isLoading = !!toolExtras?.isLoading || apiLoading;
  const isSuccess = !!toolExtras?.success;
  const hasErrors = !!(toolExtras?.errors && toolExtras.errors.length > 0) || !!localError;

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full">
      <div className="rounded-lg border bg-focus text-card-foreground shadow p-4 max-w-md">
        {info.title && <div className="text-lg font-semibold mb-1">{info.title}</div>}
        <div className="flex flex-col flex-wrap text-sm text-muted-foreground mb-3">
          {info.topic && <div>Topic: {info.topic}</div>}
          {info.difficulty && <div>Difficulty: {info.difficulty}</div>}
          {typeof info.questionCount === 'number' && <div>{info.questionCount} questions</div>}
        </div>
        {info.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
            <CurioMarkdown content={info.description} />
          </div>
        )}
        {hasErrors && (
          <div className="text-sm text-red-600">{toolExtras?.errors?.[0] || localError}</div>
        )}
        <div className="flex justify-end mt-2">
          {isSuccess && !hasErrors ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }}
            >
              <Check className="h-5 w-5 text-emerald-600" aria-label="Created" />
            </motion.div>
          ) : (
            <Button onClick={handleCreateMockExam} disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create Practice Test'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}