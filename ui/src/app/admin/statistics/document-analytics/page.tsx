'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { useDocumentAnalyticsApi, type DocumentAnalytics } from "@/hooks/api/document-analytics/use-document-analytics.api";
import { useMemo, useState, useEffect } from "react";
import { startOfMonth, subDays, format, endOfMonth, endOfDay } from 'date-fns';

type TimeRange = 'current-month' | 'last-7-days' | 'last-30-days';

interface TimeMetrics {
  summaryFirstStreamed: number | null; // milliseconds
  datalabCompleted: number | null;
  flashcardGenerationCompleted: number | null;
  embeddingCompleted: number | null;
  categorisationCompleted: number | null;
}

function calculateTimeDifference(startTime: string | null | undefined, endTime: string | null | undefined): number | null {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diff = end.getTime() - start.getTime();
  // Filter out negative differences (shouldn't happen, but protect against clock skew or data issues)
  return diff >= 0 ? diff : null;
}

function calculateMetrics(analytics: DocumentAnalytics[]): {
  summaryFirstStreamed: number[];
  datalabCompleted: number[];
  flashcardGenerationCompleted: number[];
  embeddingCompleted: number[];
  categorisationCompleted: number[];
  totalDocuments: number;
  summaryFirstStreamedFailures: number;
  datalabCompletedFailures: number;
  flashcardGenerationCompletedFailures: number;
  embeddingCompletedFailures: number;
  categorisationCompletedFailures: number;
} {
  const summaryFirstStreamed: number[] = [];
  const datalabCompleted: number[] = [];
  const flashcardGenerationCompleted: number[] = [];
  const embeddingCompleted: number[] = [];
  const categorisationCompleted: number[] = [];

  // Filter to only documents with uploadTime (all documents should have this)
  const documentsWithUploadTime = analytics.filter(entry => entry.uploadTime);
  const totalDocuments = documentsWithUploadTime.length;

  documentsWithUploadTime.forEach((entry) => {
    const summaryTime = calculateTimeDifference(entry.uploadTime, entry.summaryFirstStreamedTime);
    if (summaryTime !== null) {
      summaryFirstStreamed.push(summaryTime);
    }

    const datalabTime = calculateTimeDifference(entry.uploadTime, entry.datalabCompletedTime);
    if (datalabTime !== null) {
      datalabCompleted.push(datalabTime);
    }

    const flashcardTime = calculateTimeDifference(entry.uploadTime, entry.flashcardGenerationCompletedTime);
    if (flashcardTime !== null) {
      flashcardGenerationCompleted.push(flashcardTime);
    }

    const embeddingTime = calculateTimeDifference(entry.uploadTime, entry.embeddingCompletedTime);
    if (embeddingTime !== null) {
      embeddingCompleted.push(embeddingTime);
    }

    const categorisationTime = calculateTimeDifference(entry.uploadTime, entry.categorisationCompletedTime);
    if (categorisationTime !== null) {
      categorisationCompleted.push(categorisationTime);
    }
  });

  return {
    summaryFirstStreamed,
    datalabCompleted,
    flashcardGenerationCompleted,
    embeddingCompleted,
    categorisationCompleted,
    totalDocuments,
    summaryFirstStreamedFailures: totalDocuments - summaryFirstStreamed.length,
    datalabCompletedFailures: totalDocuments - datalabCompleted.length,
    flashcardGenerationCompletedFailures: totalDocuments - flashcardGenerationCompleted.length,
    embeddingCompletedFailures: totalDocuments - embeddingCompleted.length,
    categorisationCompletedFailures: totalDocuments - categorisationCompleted.length,
  };
}

function calculateMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function MetricCard({ 
  title, 
  value, 
  successCount, 
  failureCount, 
  totalDocuments 
}: { 
  title: string; 
  value: number | null; 
  successCount: number;
  failureCount: number;
  totalDocuments: number;
}) {
  const failurePercentage = totalDocuments > 0 
    ? Math.round((failureCount / totalDocuments) * 100) 
    : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{successCount} successful</span>
      </div>
      <div className="text-2xl font-semibold mb-2">
        {value !== null ? formatDuration(value) : 'N/A'}
      </div>
      {failureCount > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="text-red-600 font-medium">{failurePercentage}% failed</span>
          {' '}({failureCount} of {totalDocuments})
        </div>
      )}
    </Card>
  );
}

export default function DocumentAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('current-month');

  const dateRange = useMemo(() => {
    const now = new Date();

    let end: Date;
    let start: Date;

    switch (timeRange) {
      case 'current-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last-7-days':
        start = subDays(now, 7);
        end = endOfDay(now);
        break;
      case 'last-30-days':
        start = subDays(now, 30);
        end = endOfDay(now);
        break;
    }

    return {
      start,
      end,
    };
  }, [timeRange]);

  const {
    data: allAnalytics,
    isLoading,
  } = useDocumentAnalyticsApi({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const metrics = useMemo(() => {
    return calculateMetrics(allAnalytics);
  }, [allAnalytics]);

  const means = useMemo(() => {
    return {
      summaryFirstStreamed: calculateMean(metrics.summaryFirstStreamed),
      datalabCompleted: calculateMean(metrics.datalabCompleted),
      flashcardGenerationCompleted: calculateMean(metrics.flashcardGenerationCompleted),
      embeddingCompleted: calculateMean(metrics.embeddingCompleted),
      categorisationCompleted: calculateMean(metrics.categorisationCompleted),
    };
  }, [metrics]);

  const rangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'current-month':
        return `Current Month (${format(new Date(dateRange.start), 'MMM d')} - ${format(new Date(dateRange.end), 'MMM d')})`;
      case 'last-7-days':
        return `Last 7 Days (${format(new Date(dateRange.start), 'MMM d')} - ${format(new Date(dateRange.end), 'MMM d')})`;
      case 'last-30-days':
        return `Last 30 Days (${format(new Date(dateRange.start), 'MMM d')} - ${format(new Date(dateRange.end), 'MMM d')})`;
    }
  }, [timeRange, dateRange]);

  return (
    <div className="container p-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/statistics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Document Analytics</h1>
          <p className="text-sm text-muted-foreground">Processing time metrics for document analysis</p>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={timeRange === 'current-month' ? 'default' : 'outline'}
          onClick={() => setTimeRange('current-month')}
          size="sm"
        >
          Current Month
        </Button>
        <Button
          variant={timeRange === 'last-7-days' ? 'default' : 'outline'}
          onClick={() => setTimeRange('last-7-days')}
          size="sm"
        >
          Last 7 Days
        </Button>
        <Button
          variant={timeRange === 'last-30-days' ? 'default' : 'outline'}
          onClick={() => setTimeRange('last-30-days')}
          size="sm"
        >
          Last 30 Days
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Summary</h2>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {rangeLabel} • {metrics.totalDocuments} documents analyzed
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Summary First Streamed"
              value={means.summaryFirstStreamed}
              successCount={metrics.summaryFirstStreamed.length}
              failureCount={metrics.summaryFirstStreamedFailures}
              totalDocuments={metrics.totalDocuments}
            />
            <MetricCard
              title="Datalab Completed"
              value={means.datalabCompleted}
              successCount={metrics.datalabCompleted.length}
              failureCount={metrics.datalabCompletedFailures}
              totalDocuments={metrics.totalDocuments}
            />
            <MetricCard
              title="Flashcard Generation Completed"
              value={means.flashcardGenerationCompleted}
              successCount={metrics.flashcardGenerationCompleted.length}
              failureCount={metrics.flashcardGenerationCompletedFailures}
              totalDocuments={metrics.totalDocuments}
            />
            <MetricCard
              title="Embedding Completed"
              value={means.embeddingCompleted}
              successCount={metrics.embeddingCompleted.length}
              failureCount={metrics.embeddingCompletedFailures}
              totalDocuments={metrics.totalDocuments}
            />
            <MetricCard
              title="Categorisation Completed"
              value={means.categorisationCompleted}
              successCount={metrics.categorisationCompleted.length}
              failureCount={metrics.categorisationCompletedFailures}
              totalDocuments={metrics.totalDocuments}
            />
          </div>
        </div>
      )}
    </div>
  );
}

