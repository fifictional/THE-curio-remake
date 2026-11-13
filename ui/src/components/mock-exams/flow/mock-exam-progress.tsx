import { MockExamQuestion, QuestionAnswer } from "@/lib/types/mock-exam";

interface MockExamProgressProps {
  questionCount: number;
  answers: QuestionAnswer[];
  questions: MockExamQuestion[];
}

export type AnswerStatus = 'not_done' | 'correct' | 'wrong';

export function MockExamProgress({
  questionCount,
  answers,
  questions,
}: MockExamProgressProps) {
  return (
    <div className="flex items-center gap-1 w-full mt-10">
      {Array.from({ length: questionCount }).map((_, i) => {
        const state: AnswerStatus = answers.length - 1 < i
          ? 'not_done'
          : answers[i]?.givenAnswer === questions[i]?.answer
            ? 'correct' 
            : 'wrong';
        const isCurrent = i === answers.length;
        const cls = isCurrent
          ? 'bg-gray-800'
          : state === 'correct'
            ? 'bg-green-200'
            : state === 'wrong'
              ? 'bg-red-200'
              : 'bg-gray-400';
        return <div key={i} className={`h-2 flex-1 rounded-sm duration-300 ease-in-out transition-colors ${cls}`} aria-label={`Question ${i + 1}`}></div>;
      })}
    </div>
  )
}