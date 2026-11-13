'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuestionExtractJobsListApi } from '@/hooks/api/question-extractor';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'FAILED':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'PROCESSING':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function QuestionExtractJobsList() {
  const { jobs, isLoading, refetch } = useQuestionExtractJobsListApi();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading extraction history...</p>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Extraction Jobs Yet</h3>
          <p className="text-muted-foreground">
            Upload an exam paper to start extracting questions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Extraction History</CardTitle>
            <CardDescription>View your previous question extraction jobs</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.questionExtractJobUuid}
              href={`/admin/question-extractor/${job.questionExtractJobUuid}`}
              className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* File Name */}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{job.fileName}</span>
                  </div>

                  {/* Status and Details */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(job.status)}
                      <Badge className={`text-xs ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </Badge>
                    </div>
                    
                    {job.status === 'COMPLETED' && job.totalQuestions !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {job.totalQuestions} questions
                      </Badge>
                    )}
                    
                    <Badge variant="secondary" className="text-xs">
                      {job.fileType.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Error Message */}
                  {job.status === 'FAILED' && job.error && (
                    <div className="text-xs text-red-600 mt-1">
                      Error: {job.error}
                    </div>
                  )}

                  {/* Date and User */}
                  <div className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString()}
                    {job.userUuid && (
                      <span className="ml-2">• User: {job.userUuid.substring(0, 8)}...</span>
                    )}
                  </div>
                </div>

                {/* View Button */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <span>View</span>
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

