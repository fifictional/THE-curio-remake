import type { MockExamQuestion, QuestionAnswer } from "@/lib/types/mock-exam";
import { CurioMarkdown } from "@/components/core/curio-markdown";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useAnalytics } from "@/providers";

interface MockExamQuizRecapProps {
  questions: MockExamQuestion[];
  answers: QuestionAnswer[];
  isFreeTrial?: boolean;
}

export function MockExamQuizRecap({ questions, answers, isFreeTrial }: MockExamQuizRecapProps) {
  const router = useRouter();
  const { track } = useAnalytics();

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl">
      {questions.map((q) => {
        const ans = answers.find((a) => a.index === q.index);
        const isCorrect = ans?.givenAnswer != null && ans.givenAnswer === q.answer;
        return (
          <div key={q.index} className={`rounded-md border p-3 ${isCorrect ? 'border-green-500 bg-green-50' : ans?.givenAnswer != null ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
            <div className="text-sm font-medium text-gray-900 mb-2">Q{q.index + 1}. <CurioMarkdown content={q.questionContent} /></div>
            {ans?.givenAnswer != null && (
              <div className="text-sm">
                <div className="mb-1">Your answer: <CurioMarkdown content={q.options[ans.givenAnswer]} /></div>
                {!isCorrect && (<>
                  <div className="mt-2 mb-3 text-gray-700">
                    <div>Correct answer: <CurioMarkdown content={q.options[q.answer]} /></div>
                  </div>
                  {q.answerExplanations?.length ? (<div>Why was this the correct answer?
                    <CurioMarkdown content={q.answerExplanations[q.answer]} />
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {isFreeTrial && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 text-center">
          <h3 className="text-xl font-semibold mb-3">Ready for more SAT practice?</h3>
          <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
            Unlock the full SAT question bank with hundreds of verified questions, detailed explanations, and unlimited practice tests.
          </p>
          <Button 
            onClick={() => {
              router.push('/sat-us-exam-bundle');
              track('mock-exam-quiz-recap_buy_bundle_clicked');
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