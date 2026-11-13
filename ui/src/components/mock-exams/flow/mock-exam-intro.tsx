import { Button } from "@/components/ui/button";
import { CurioMarkdown } from "@/components/core/curio-markdown";

interface MockExamIntroProps {
  title?: string;
  description?: string;
  instructions?: string;
  questionCount?: number;
  time?: string | null;
  canStart?: boolean;
  onStart: () => void;
}

function secondsToMinutes(seconds: string) {
  const minutes = Math.floor(parseInt(seconds) / 60);
  const remainingSeconds = parseInt(seconds) % 60;
  return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`;
}

export function MockExamIntro({ title, description, instructions, questionCount, time, canStart, onStart }: MockExamIntroProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {title && <h2 className="text-2xl font-semibold">{title}</h2>}
      {description && <CurioMarkdown content={description} />}
      {/* {instructions && <CurioMarkdown content={instructions} />} */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {typeof questionCount === 'number' && <span>{questionCount} questions</span>}
        {time && time !== '0' && <span>•</span>}
        {time && time !== '0' && <span>{secondsToMinutes(time)}</span>}
      </div>
      {canStart && <Button onClick={onStart} className="mt-2">Start Exam</Button>}
      {!canStart && <div className="mt-2">
        Generating questions...
      </div>}
    </div>
  );
}
