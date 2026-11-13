"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Clock, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuestionGeneratorApi } from '@/hooks/api/question-generator/use-question-generator.api';

export default function QuestionGeneratorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const { createGenerationJob, isCreating, generationJobs, isLoadingJobs } = useQuestionGeneratorApi();

  const handleStartGeneration = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for question generation');
      return;
    }

    const jobUuid = await createGenerationJob(prompt);
    if (jobUuid) {
      router.push(`/admin/question-generator/${jobUuid}`);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-gray-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'GENERATING_QUESTIONS':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating Questions</Badge>;
      case 'GENERATING_REFERENCES':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700"><Zap className="w-3 h-3 mr-1" />Generating References</Badge>;
      case 'GENERATING_ANSWERS':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-700"><Zap className="w-3 h-3 mr-1" />Generating Answers</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Question Generator</h1>
        <p className="text-gray-600">Generate SAT questions using AI</p>
      </div>

      {/* New Generation Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Start New Generation
          </CardTitle>
          <CardDescription>
            Enter a prompt to generate new SAT questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">Generation Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="E.g., Generate 10 challenging SAT Math questions about quadratic equations and parabolas, focusing on vertex form and axis of symmetry..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              Be specific about the topic, difficulty, number of questions, and any special requirements.
            </p>
          </div>
          <Button 
            onClick={handleStartGeneration} 
            disabled={isCreating || !prompt.trim()}
            className="w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Job...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Start Generation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Generations */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Generations</CardTitle>
          <CardDescription>View and manage generated question sets</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : generationJobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No generation jobs yet.</p>
              <p className="text-sm mt-1">Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generationJobs.map((job) => (
                <Link 
                  key={job.questionGenerationJobUuid} 
                  href={`/admin/question-generator/${job.questionGenerationJobUuid}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(job.status)}
                          {job.totalQuestions !== undefined && job.totalQuestions > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {job.totalQuestions} questions
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                          {job.prompt}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {job.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

