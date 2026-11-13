"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticator } from '@/lib/local-auth-react';
import { ArrowLeft } from 'lucide-react';
import { useSATMiniExamLogs, type SATProgressData } from '@/hooks/api/sat-mini/use-sat-mini-exam-logs.api';

type TimeRange = 'week' | 'month' | '30days';

// Simple Line Chart Component
function SimpleLineChart({ data }: { data: SATProgressData[] }) {
  if (data.length === 0) return null;

  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const minScore = 400;
  const maxScore = 1600;
  const scoreRange = maxScore - minScore;

  const points = sortedData.map((item, index) => {
    const x = (index / Math.max(sortedData.length - 1, 1)) * 100;
    const y = ((maxScore - item.score) / scoreRange) * 100;
    return { x, y, score: item.score, date: item.date };
  });

  // Generate path for the line
  const linePath = points.map((point, i) => 
    `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Generate path for the area fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L 0 100 Z`;

  return (
    <div className="relative w-full h-96 bg-white">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-600 pr-2">
        <span>1600</span>
        <span>1400</span>
        <span>1200</span>
        <span>1000</span>
        <span>800</span>
        <span>600</span>
        <span>400</span>
      </div>

      {/* Chart area */}
      <div className="absolute left-12 right-0 top-0 bottom-12">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 20, 40, 60, 80, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="0.2"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="rgba(59, 130, 246, 0.1)"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="0.5"
          />

          {/* Points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill="rgb(59, 130, 246)"
                stroke="white"
                strokeWidth="0.3"
                className="cursor-pointer hover:r-2"
              />
              <title>{`${new Date(point.date).toLocaleDateString()}: ${point.score}`}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-12 right-0 bottom-0 h-12 flex justify-between items-start pt-2">
        {sortedData.map((item, i) => {
          if (sortedData.length > 10 && i % Math.ceil(sortedData.length / 7) !== 0) return null;
          return (
            <span key={i} className="text-xs text-gray-600">
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function SATProgressPage() {
  const { user } = useAuthenticator(context => [context.user]);
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  
  const { examLogs, isLoading, getWeeklyLogs, getMonthlyLogs, getLast30DaysLogs } = useSATMiniExamLogs(user?.userId || null);

  // Get data based on selected time range
  const progressData = useMemo((): SATProgressData[] => {
    switch (timeRange) {
      case 'week':
        return getWeeklyLogs();
      case 'month':
        return getMonthlyLogs();
      case '30days':
        return getLast30DaysLogs();
      default:
        return [];
    }
  }, [timeRange, getWeeklyLogs, getMonthlyLogs, getLast30DaysLogs]);


  // Calculate statistics
  const stats = useMemo(() => {
    if (progressData.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        improvement: 0,
        totalTests: 0,
      };
    }

    const scores = progressData.map(d => d.score);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    // Calculate improvement (first vs last)
    const sortedByDate = [...progressData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const improvement = sortedByDate.length > 1 
      ? sortedByDate[sortedByDate.length - 1].score - sortedByDate[0].score 
      : 0;

    return {
      average,
      highest,
      lowest,
      improvement,
      totalTests: progressData.length,
    };
  }, [progressData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            SAT Score Progress
          </h1>
          <p className="text-lg text-gray-600">
            Track your SAT score improvement over time
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '30days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Tests Taken</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Average</p>
            <p className="text-2xl font-bold text-blue-600">{stats.average}</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Highest</p>
            <p className="text-2xl font-bold text-green-600">{stats.highest}</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Lowest</p>
            <p className="text-2xl font-bold text-orange-600">{stats.lowest}</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Improvement</p>
            <p className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.improvement >= 0 ? '+' : ''}{stats.improvement}
            </p>
          </div>
        </div>

        {/* Chart */}
        {progressData.length > 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Score Trend</h2>
            <SimpleLineChart data={progressData} />
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-lg text-gray-600 mb-4">
              No test data available for the selected time range
            </p>
            <button
              onClick={() => router.push('/satus-onboarding')}
              className="bg-blue-600 text-white hover:bg-blue-700 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Take Your First Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

