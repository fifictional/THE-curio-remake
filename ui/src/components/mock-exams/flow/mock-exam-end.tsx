import { Button } from "@/components/ui/button";
import { MockExamQuestion, QuestionAnswer } from "@/lib/types/mock-exam";
import { useAnalytics } from "@/providers";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";

interface MockExamEndProps {
  title?: string;
  answers: QuestionAnswer[];
  questions: MockExamQuestion[];
  score: number; // overall points, may exceed total questions
  onRestart?: () => void;
  isFreeTrial?: boolean;
}

export function MockExamEnd({ title, answers, score, questions, onRestart, isFreeTrial }: MockExamEndProps) {
  const correctCount = useMemo(() => {
    const indexToAnswer = new Map<number, number>(questions.map((q) => [q.index, q.answer]));
    return answers.reduce((acc, a) => {
      const expected = indexToAnswer.get(a.index);
      if (expected == null) return acc;
      return acc + (a.givenAnswer != null && a.givenAnswer === expected ? 1 : 0);
    }, 0);
  }, [answers, questions]);

  const wrong = Math.max(questions.length - correctCount, 0);
  const correctPct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const { track } = useAnalytics();
  const router = useRouter();

  router.prefetch('/mock-exams');

  const handleViewResults = useCallback(() => {
    track('mock_exam_end_page_start_new_clicked');
    router.push(`/mock-exams`);
  }, [router, track]);

  const handleRestart = useCallback(() => {
    track('mock_exam_end_page_restart_clicked');
    track('mock-exam-start-clicked', {
      title: title || '',
      isFreeTrial: isFreeTrial || false,
    });
    onRestart?.();
  }, [onRestart, track]);

  const [showOutroScore, setShowOutroScore] = useState(false);
  useEffect(() => {
    setShowOutroScore(false);
    const t = setTimeout(() => setShowOutroScore(true), 2100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-2xl font-semibold">Exam Complete</div>

      {(() => {
        const { ScoreRing } = require("@/components/ui/score-ring");
        return <ScoreRing percent={correctPct} />;
      })()}
      <div className={`text-muted-foreground transition-opacity duration-300 ${showOutroScore ? 'opacity-100' : 'opacity-0'}`}>You answered {correctCount} out of {questions.length} correctly. Score: {score}</div>
      <div className="mt-2 flex gap-2">
        <Button className="bg-gray-600 hover:bg-gray-500" onClick={handleViewResults}>Start new</Button>
        <Button className="bg-gray-700 hover:bg-gray-600" onClick={handleRestart}>Restart</Button>
      </div>
      
      {isFreeTrial && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">Unlock the Full SAT Experience</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get access to hundreds of verified questions with detailed explanations
          </p>
          <Button 
            onClick={() => {
              router.push('/sat-us-exam-bundle');
              track('mock-exam-end-page_buy_bundle_clicked');
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy SAT Bundle - $49
          </Button>
        </div>
      )}
    </div>
  );
}
