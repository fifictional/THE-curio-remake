import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { CurioMarkdown } from '@/components/core/curio-markdown';

interface QuestionExtractJob {
  questionExtractJobUuid: string;
  status: string;
  fileName: string;
  error?: string;
  totalQuestions?: number;
  extractionLogs?: string;
}

interface QuestionExtractorJobStatusProps {
  job: QuestionExtractJob;
}

export function QuestionExtractorJobStatus({ job }: QuestionExtractorJobStatusProps) {
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Parse logs to get last line
  const { lastLog, allLogs, hasLogs } = useMemo(() => {
    if (!job.extractionLogs) return { lastLog: null, allLogs: null, hasLogs: false };
    
    const lines = job.extractionLogs.split('\n').filter(line => line.trim());
    return {
      lastLog: lines[lines.length - 1] || null,
      allLogs: job.extractionLogs,
      hasLogs: lines.length > 0
    };
  }, [job.extractionLogs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                job.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : job.status === 'QUESTION_EXTRACTED'
                  ? 'bg-yellow-100 text-yellow-800'
                  : job.status === 'FAILED'
                  ? 'bg-red-100 text-red-800'
                  : job.status === 'PROCESSING'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {job.status === 'QUESTION_EXTRACTED' ? 'Questions Extracted' : job.status}
            </span>
          </div>

          {/* Extraction Logs */}
          {hasLogs && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Extraction Progress</span>
                {allLogs && allLogs.split('\n').length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllLogs(!showAllLogs)}
                    className="h-6 px-2 text-xs"
                  >
                    {showAllLogs ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show All
                      </>
                    )}
                  </Button>
                )}
              </div>

              {showAllLogs ? (
                <div className="text-xs text-gray-700 max-h-64 overflow-y-auto bg-white p-3 rounded border space-y-2">
                  {allLogs?.split('\n').filter(line => line.trim()).map((line, idx) => (
                    <div key={idx} className="border-b last:border-b-0 pb-2 last:pb-0">
                      <CurioMarkdown content={line} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-700 bg-white p-2 rounded border">
                  <CurioMarkdown content={lastLog || ''} />
                </div>
              )}
            </div>
          )}
          
          {job.status === 'PROCESSING' && !hasLogs && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting questions...
            </div>
          )}

          {job.status === 'FAILED' && job.error && (
            <div className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
              <strong>Error:</strong> {job.error}
            </div>
          )}

          {(job.status === 'COMPLETED' || job.status === 'QUESTION_EXTRACTED') && job.totalQuestions !== undefined && (
            <div className="text-sm text-green-600 mt-2 p-2 bg-green-50 rounded border border-green-200">
              ✅ Successfully extracted {job.totalQuestions} questions
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

