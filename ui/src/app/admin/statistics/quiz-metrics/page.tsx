'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileQuestion, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useUserRequestsByCategoryApi } from "@/hooks/api/user-requests";
import { UserRequest } from "@/lib/types/user-request";
import { useMemo, useEffect } from "react";
import { subHours, subDays, startOfMinute, startOfHour, format, eachMinuteOfInterval, eachHourOfInterval } from 'date-fns';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Quiz-related feature values
const QUIZ_FEATURES = ['quiz-generation', 'document_quiz', 'generation_practice_test'] as const;

function isQuizRequest(request: UserRequest): boolean {
  return request.feature !== undefined && QUIZ_FEATURES.includes(request.feature as any);
}

type BoxPlotStats = {
  minMax: [number, number];
  mean: number;
  count: number;
};

type MinuteData = {
  minute: string;
  timestamp: Date;
  count: number;
  boxPlot: BoxPlotStats | null;
};

type HourData = {
  hour: string;
  timestamp: Date;
  count: number;
  boxPlot: BoxPlotStats | null;
};

function calculateBoxPlotStats(values: number[]): BoxPlotStats | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  
  return { minMax: [min, max], mean, count: n };
}

function aggregateByMinute(requests: UserRequest[], startDate: Date, endDate: Date): MinuteData[] {
  const buckets = new Map<string, number[]>();
  
  // Initialize all minute buckets
  const minutes = eachMinuteOfInterval({ start: startDate, end: endDate });
  minutes.forEach(minute => {
    const minuteKey = startOfMinute(minute).toISOString();
    buckets.set(minuteKey, []);
  });
  
  // Fill buckets with latency values (convert from ms to seconds)
  requests.forEach(request => {
    if (!request.latency) return;
    
    const requestMinute = startOfMinute(new Date(request.createdAt)).toISOString();
    const bucket = buckets.get(requestMinute);
    if (bucket) {
      bucket.push(request.latency / 1000); // Convert ms to seconds
    }
  });
  
  // Calculate stats for each bucket
  return Array.from(buckets.entries()).map(([minuteKey, latencies]) => {
    const timestamp = new Date(minuteKey);
    return {
      minute: format(timestamp, 'HH:mm'),
      timestamp,
      count: latencies.length,
      boxPlot: calculateBoxPlotStats(latencies),
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function aggregateByHour(requests: UserRequest[], startDate: Date, endDate: Date): HourData[] {
  const buckets = new Map<string, number[]>();
  
  // Initialize all hour buckets
  const hours = eachHourOfInterval({ start: startDate, end: endDate });
  hours.forEach(hour => {
    const hourKey = startOfHour(hour).toISOString();
    buckets.set(hourKey, []);
  });
  
  // Fill buckets with latency values (convert from ms to seconds)
  requests.forEach(request => {
    if (!request.latency) return;
    
    const requestHour = startOfHour(new Date(request.createdAt)).toISOString();
    const bucket = buckets.get(requestHour);
    if (bucket) {
      bucket.push(request.latency / 1000); // Convert ms to seconds
    }
  });
  
  // Calculate stats for each bucket
  return Array.from(buckets.entries()).map(([hourKey, latencies]) => {
    const timestamp = new Date(hourKey);
    return {
      hour: format(timestamp, 'HH:mm'),
      timestamp,
      count: latencies.length,
      boxPlot: calculateBoxPlotStats(latencies),
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function ResponseTimeChart({ data, title, xAxisLabel, yAxisLabel }: { 
  data: (MinuteData | HourData)[]; 
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
}) {
  // Prepare data for recharts - show min, max, and mean only
  const chartData = data.map((item) => ({
    time: 'minute' in item ? item.minute : item.hour,
    ...(item.boxPlot ? {
      minMax: item.boxPlot.minMax,
      mean: item.boxPlot.mean,
      count: item.boxPlot.count,
    } : {
      minMax: null,
      mean: null,
      count: 0,
    }),
  }));

  // Calculate max value for Y axis
  const maxValues = chartData
    .map(d => d.minMax?.[1] ?? 0)
    .filter(v => v > 0);
  const maxValue = maxValues.length > 0 ? Math.max(...maxValues) : 1;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;
    
    const data = payload[0].payload;
    if (data.count === 0) {
      return (
        <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          <div className="text-xs">No data</div>
        </div>
      );
    }
    
    return (
      <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        <div className="text-xs space-y-1">
          <div>Count: <strong>{data.count}</strong> quizzes</div>
          {data.minMax !== null && <div>Min: <strong>{data.minMax[0].toFixed(2)}s</strong></div>}
          {data.mean !== null && <div>Mean: <strong>{data.mean.toFixed(2)}s</strong></div>}
          {data.minMax !== null && <div>Max: <strong>{data.minMax[1].toFixed(2)}s</strong></div>}
        </div>
      </div>
    );
  };

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={data.length > 24 ? Math.floor(data.length / 24) : 0}
            />
            <YAxis 
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'insideLeft', 
                offset: 0,
                style: { textAnchor: 'middle' }
              }}
              domain={[0, maxValue * 1.1]}
              tickFormatter={(value) => Math.round(value) + 's'}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Area band showing the range from min to max */}
            <Area
              type="monotone"
              dataKey="minMax"
              name="Min/Max"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              connectNulls={true}
              isAnimationActive={false}
            />
            {/* Line showing mean */}
            <Line
              type="monotone"
              dataKey="mean"
              name="Mean"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4, fill: '#ef4444' }}
              connectNulls={true}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 opacity-20"></div>
            <span>Range (Min-Max)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Mean</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function QuizMetricsPage() {
  const now = new Date();
  const oneHourAgo = subHours(now, 1);
  const oneDayAgo = subDays(now, 1);

  const startDateHour = useMemo(() => oneHourAgo.toISOString(), []);
  const endDateHour = useMemo(() => now.toISOString(), []);
  
  const startDateDay = useMemo(() => oneDayAgo.toISOString(), []);
  const endDateDay = useMemo(() => now.toISOString(), []);

  const { 
    userRequests: generationRequestsHour, 
    isLoading: generationLoadingHour,
    hasNextPage: generationHasNextPageHour,
    loadNextPage: generationLoadNextPageHour,
  } = useUserRequestsByCategoryApi({
    category: 'generation',
    startDate: startDateHour,
    endDate: endDateHour,
  });

  const { 
    userRequests: generationRequestsDay, 
    isLoading: generationLoadingDay,
    hasNextPage: generationHasNextPageDay,
    loadNextPage: generationLoadNextPageDay,
  } = useUserRequestsByCategoryApi({
    category: 'generation',
    startDate: startDateDay,
    endDate: endDateDay,
  });

  // Filter to only quiz-related requests
  const quizRequestsHour = useMemo(() => 
    generationRequestsHour.filter(isQuizRequest),
    [generationRequestsHour]
  );

  const quizRequestsDay = useMemo(() => 
    generationRequestsDay.filter(isQuizRequest),
    [generationRequestsDay]
  );

  // Auto-load all pages
  useEffect(() => {
    if (!generationLoadingHour && generationHasNextPageHour) {
      generationLoadNextPageHour();
    }
  }, [generationLoadingHour, generationHasNextPageHour, generationLoadNextPageHour]);

  useEffect(() => {
    if (!generationLoadingDay && generationHasNextPageDay) {
      generationLoadNextPageDay();
    }
  }, [generationLoadingDay, generationHasNextPageDay, generationLoadNextPageDay]);

  // Calculate rolling metrics for the last hour
  const rollingHourMetrics = useMemo(() => {
    const oneHourAgo = subHours(new Date(), 1);
    const recentRequests = quizRequestsHour.filter(req => 
      new Date(req.createdAt) >= oneHourAgo
    );
    
    const totalQuizzes = recentRequests.length;
    const latencies = recentRequests
      .map(req => req.latency)
      .filter((lat): lat is number => lat !== undefined && lat !== null)
      .map(lat => lat / 1000); // Convert to seconds
    
    const avgResponseTime = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    
    const errorCount = recentRequests.filter(req => req.requestStatus >= 400).length;
    const errorRate = totalQuizzes > 0 ? (errorCount / totalQuizzes) * 100 : 0;
    
    return {
      totalQuizzes,
      avgResponseTime,
      errorRate,
    };
  }, [quizRequestsHour]);

  // Calculate rolling metrics for the last day
  const rollingDayMetrics = useMemo(() => {
    const oneDayAgo = subDays(new Date(), 1);
    const recentRequests = quizRequestsDay.filter(req => 
      new Date(req.createdAt) >= oneDayAgo
    );
    
    const totalQuizzes = recentRequests.length;
    const latencies = recentRequests
      .map(req => req.latency)
      .filter((lat): lat is number => lat !== undefined && lat !== null)
      .map(lat => lat / 1000); // Convert to seconds
    
    const avgResponseTime = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    
    const errorCount = recentRequests.filter(req => req.requestStatus >= 400).length;
    const errorRate = totalQuizzes > 0 ? (errorCount / totalQuizzes) * 100 : 0;
    
    return {
      totalQuizzes,
      avgResponseTime,
      errorRate,
    };
  }, [quizRequestsDay]);

  // Aggregate data for charts
  const minuteData = useMemo(() => 
    aggregateByMinute(quizRequestsHour, oneHourAgo, now),
    [quizRequestsHour, oneHourAgo, now]
  );

  const hourData = useMemo(() => 
    aggregateByHour(quizRequestsDay, oneDayAgo, now),
    [quizRequestsDay, oneDayAgo, now]
  );

  const isLoading = generationLoadingHour || generationLoadingDay;

  return (
    <div className="container p-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/statistics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Quiz Performance Metrics</h1>
          <p className="text-sm text-muted-foreground">Monitor quiz generation volume, response times, and error rates</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          {/* Hourly Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Quizzes in the last Hour"
              value={rollingHourMetrics.totalQuizzes.toLocaleString()}
              subtitle="Rolling last hour"
              icon={FileQuestion}
            />
            <MetricCard
              title="Average Response Time in the last Hour"
              value={rollingHourMetrics.avgResponseTime > 0 
                ? `${rollingHourMetrics.avgResponseTime.toFixed(2)}s`
                : 'N/A'}
              subtitle="Rolling last hour"
              icon={Clock}
            />
            <MetricCard
              title="Error Rate in the last Hour"
              value={rollingHourMetrics.totalQuizzes > 0
                ? `${rollingHourMetrics.errorRate.toFixed(2)}%`
                : 'N/A'}
              subtitle={`${rollingHourMetrics.totalQuizzes > 0 ? Math.round((rollingHourMetrics.errorRate / 100) * rollingHourMetrics.totalQuizzes) : 0} errors`}
              icon={AlertCircle}
            />
          </div>

          {/* Hourly Response Time Chart */}
          <ResponseTimeChart
            data={minuteData}
            title="Response Time Distribution - Last Hour (per minute)"
            xAxisLabel="Time (minutes)"
            yAxisLabel="Response Time (seconds)"
          />

          {/* Daily Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Quizzes in the last Day"
              value={rollingDayMetrics.totalQuizzes.toLocaleString()}
              subtitle="Rolling last 24 hours"
              icon={FileQuestion}
            />
            <MetricCard
              title="Average Response Time in the last Day"
              value={rollingDayMetrics.avgResponseTime > 0
                ? `${rollingDayMetrics.avgResponseTime.toFixed(2)}s`
                : 'N/A'}
              subtitle="Rolling last 24 hours"
              icon={Clock}
            />
            <MetricCard
              title="Error Rate in the last Day"
              value={rollingDayMetrics.totalQuizzes > 0
                ? `${rollingDayMetrics.errorRate.toFixed(2)}%`
                : 'N/A'}
              subtitle={`${rollingDayMetrics.totalQuizzes > 0 ? Math.round((rollingDayMetrics.errorRate / 100) * rollingDayMetrics.totalQuizzes) : 0} errors`}
              icon={AlertCircle}
            />
          </div>

          {/* Daily Response Time Chart */}
          <ResponseTimeChart
            data={hourData}
            title="Response Time Distribution - Last Day (per hour)"
            xAxisLabel="Time (hours)"
            yAxisLabel="Response Time (seconds)"
          />
        </div>
      )}
    </div>
  );
}

