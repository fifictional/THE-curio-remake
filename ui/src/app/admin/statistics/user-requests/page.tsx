'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUserRequestsByCategoryApi } from "@/hooks/api/user-requests";
import { UserRequest } from "@/lib/types/user-request";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { useMemo, useState, useEffect, useCallback } from "react";
import { subDays, startOfMinute, format, startOfHour, startOfDay, eachHourOfInterval, eachMinuteOfInterval, eachDayOfInterval } from 'date-fns';

// Custom brush tooltip component for two-line display
const BrushTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  const value = label || payload[0]?.value;
  if (!value) return null;
  
  // Split the "MM/dd HH:mm" format
  const parts = value.split(' ');
  const date = parts[0] || '';
  const time = parts[1] || '';
  
  return (
    <div className="bg-white border border-gray-300 rounded shadow-lg p-2">
      <div className="text-xs text-center leading-tight">
        <div className="font-medium">{date}</div>
        <div>{time}</div>
      </div>
    </div>
  );
};

type MinuteData = {
  minute: string;
  date: string;
  time: string;
  timestamp: Date;
  count: number;
};

type HourlyData = {
  hour: string;
  timestamp: Date;
  count: number;
};

type HeatmapData = {
  day: string;
  dayIndex: number;
  hour: number;
  count: number;
};

function aggregateByMinute(requests: UserRequest[], startDate: Date, endDate: Date): MinuteData[] {
  // Create minute buckets for the entire range
  const buckets = new Map<string, number>();
  
  // Initialize all minute buckets to 0
  const minutes = eachMinuteOfInterval({ start: startDate, end: endDate });
  minutes.forEach(minute => {
    const minuteKey = startOfMinute(minute).toISOString();
    buckets.set(minuteKey, 0);
  });
  
  // Count requests per minute
  requests.forEach(request => {
    const requestMinute = startOfMinute(new Date(request.createdAt)).toISOString();
    const currentCount = buckets.get(requestMinute) || 0;
    buckets.set(requestMinute, currentCount + 1);
  });
  
  // Convert to array
  return Array.from(buckets.entries()).map(([minuteKey, count]) => {
    const timestamp = new Date(minuteKey);
    return {
      minute: format(timestamp, 'MM/dd HH:mm'),
      date: format(timestamp, 'MM/dd'),
      time: format(timestamp, 'HH:mm'),
      timestamp,
      count,
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function aggregateByHour(requests: UserRequest[], startDate: Date, endDate: Date): HourlyData[] {
  // Create hour buckets for the entire range
  const buckets = new Map<string, number>();
  
  // Initialize all hour buckets to 0
  const hours = eachHourOfInterval({ start: startDate, end: endDate });
  hours.forEach(hour => {
    const hourKey = startOfHour(hour).toISOString();
    buckets.set(hourKey, 0);
  });
  
  // Count requests per hour
  requests.forEach(request => {
    const requestHour = startOfHour(new Date(request.createdAt)).toISOString();
    const currentCount = buckets.get(requestHour) || 0;
    buckets.set(requestHour, currentCount + 1);
  });
  
  // Convert to array
  return Array.from(buckets.entries()).map(([hourKey, count]) => {
    const timestamp = new Date(hourKey);
    return {
      hour: format(timestamp, 'MM/dd HH:mm'),
      timestamp,
      count,
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function createHeatmapData(requests: UserRequest[]): HeatmapData[] {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 6); // Last 7 days including today
  const start = startOfDay(sevenDaysAgo);
  const end = startOfDay(now);
  
  // Create a map: dayIndex_hour -> count
  const buckets = new Map<string, number>();
  
  // Initialize all buckets to 0
  const days = eachDayOfInterval({ start, end });
  days.forEach((day, dayIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dayIndex}_${hour}`;
      buckets.set(key, 0);
    }
  });
  
  // Count requests
  requests.forEach(request => {
    const requestDate = new Date(request.createdAt);
    const dayStart = startOfDay(requestDate);
    const dayIndex = Math.floor((dayStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hour = requestDate.getHours();
    
    if (dayIndex >= 0 && dayIndex < 7 && hour >= 0 && hour < 24) {
      const key = `${dayIndex}_${hour}`;
      const currentCount = buckets.get(key) || 0;
      buckets.set(key, currentCount + 1);
    }
  });
  
  // Convert to array
  const result: HeatmapData[] = [];
  days.forEach((day, dayIndex) => {
    const dayName = format(day, 'EEE');
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dayIndex}_${hour}`;
      result.push({
        day: dayName,
        dayIndex,
        hour,
        count: buckets.get(key) || 0,
      });
    }
  });
  
  return result;
}

function getHeatmapColor(count: number, maxCount: number): string {
  if (maxCount === 0) return '#f3f4f6';
  const intensity = count / maxCount;
  
  // Color scale from light blue to dark blue
  if (intensity === 0) return '#f3f4f6'; // gray for zero
  if (intensity < 0.2) return '#dbeafe'; // light blue
  if (intensity < 0.4) return '#93c5fd'; // blue
  if (intensity < 0.6) return '#60a5fa'; // medium blue
  if (intensity < 0.8) return '#3b82f6'; // darker blue
  return '#1e40af'; // darkest blue
}

function RequestsChart({ data, title }: { data: MinuteData[]; title: string }) {
  const initialEndIndex = data.length > 0 ? data.length - 1 : 0;
  const [brushStartIndex, setBrushStartIndex] = useState(0);
  const [brushEndIndex, setBrushEndIndex] = useState(initialEndIndex);
  
  // Reset brush when data changes
  useEffect(() => {
    if (data.length > 0) {
      setBrushStartIndex(0);
      setBrushEndIndex(data.length - 1);
    } else {
      setBrushStartIndex(0);
      setBrushEndIndex(0);
    }
  }, [data.length]);
  
  // Determine tick interval based on visible data range to limit number of ticks
  // interval = 0 means show all ticks, 1 means show every other tick, etc.
  const tickInterval = useMemo(() => {
    const range = brushEndIndex - brushStartIndex;
    const desiredTickCount = 12; // Target number of ticks to show
    // Calculate how many ticks to skip to get approximately desiredTickCount
    if (range <= desiredTickCount) return 0; // Show all if range is small
    return Math.floor(range / desiredTickCount);
  }, [brushStartIndex, brushEndIndex]);

  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const startIdx = brushData.startIndex;
      const endIdx = brushData.endIndex;
      // Ensure indices are valid
      const validStart = Math.max(0, Math.min(startIdx, data.length - 1));
      const validEnd = Math.max(validStart, Math.min(endIdx, data.length - 1));
      setBrushStartIndex(validStart);
      setBrushEndIndex(validEnd);
    }
  }, [data.length]);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="minute" 
              interval={tickInterval}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis label={{ value: 'Requests', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number) => [`${value} requests`, 'Count']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Requests per Minute"
              stroke="#1e40af"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Brush
              dataKey="minute"
              height={40}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
              gap={5}
              travellerWidth={10}
            >
              <Tooltip content={<BrushTooltip />} />
            </Brush>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function HeatmapChart({ data }: { data: HeatmapData[] }) {
  const maxCount = useMemo(() => {
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);
  
  // Group data by day
  const daysData = useMemo(() => {
    const days: { [key: string]: HeatmapData[] } = {};
    data.forEach(item => {
      if (!days[item.day]) {
        days[item.day] = [];
      }
      days[item.day].push(item);
    });
    // Sort by dayIndex to maintain order
    return Object.entries(days).sort((a, b) => {
      const dayIndexA = a[1][0]?.dayIndex || 0;
      const dayIndexB = b[1][0]?.dayIndex || 0;
      return dayIndexA - dayIndexB;
    });
  }, [data]);

  const numDays = daysData.length;

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-2">Hourly Request Heatmap (Last 7 Days)</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Shows request volume by hour across the week. Darker colors indicate higher request counts.
      </p>
      <div className="flex justify-center">
        <div className="inline-block">
          <div 
            className="grid gap-0.5 mb-1"
            style={{ gridTemplateColumns: `45px repeat(${numDays}, 35px)` }}
          >
            <div className="text-xs font-medium text-muted-foreground text-center">Hour</div>
            {daysData.map(([day]) => (
              <div key={day} className="text-xs font-medium text-center">
                {day}
              </div>
            ))}
          </div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div 
              key={hour} 
              className="grid gap-0.5 mb-0.5"
              style={{ gridTemplateColumns: `45px repeat(${numDays}, 35px)` }}
            >
              <div className="text-xs text-muted-foreground text-right pr-1 flex items-center justify-end">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {daysData.map(([day, dayData]) => {
                const hourData = dayData.find(d => d.hour === hour);
                const count = hourData?.count || 0;
                const color = getHeatmapColor(count, maxCount);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="h-5 rounded border border-gray-200 flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: color }}
                    title={`${day} ${hour.toString().padStart(2, '0')}:00 - ${count} requests`}
                  >
                    {count > 0 && count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-gray-200" style={{ backgroundColor: '#f3f4f6' }}></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-gray-200" style={{ backgroundColor: '#dbeafe' }}></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-gray-200" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-gray-200" style={{ backgroundColor: '#1e40af' }}></div>
          <span>High ({maxCount})</span>
        </div>
      </div>
    </Card>
  );
}

export default function UserRequestsPage() {
  const startDate = useMemo(() => subDays(new Date(), 7).toISOString(), []);
  const endDate = useMemo(() => new Date().toISOString(), []);

  const { 
    userRequests: chatRequests, 
    isLoading: chatLoading,
    hasNextPage: chatHasNextPage,
    loadNextPage: chatLoadNextPage,
  } = useUserRequestsByCategoryApi({
    category: 'chat',
    startDate,
    endDate,
  });

  const { 
    userRequests: documentRequests, 
    isLoading: documentLoading,
    hasNextPage: documentHasNextPage,
    loadNextPage: documentLoadNextPage,
  } = useUserRequestsByCategoryApi({
    category: 'document',
    startDate,
    endDate,
  });

  const { 
    userRequests: generationRequests, 
    isLoading: generationLoading,
    hasNextPage: generationHasNextPage,
    loadNextPage: generationLoadNextPage,
  } = useUserRequestsByCategoryApi({
    category: 'generation',
    startDate,
    endDate,
  });

  const { 
    userRequests: extractionRequests, 
    isLoading: extractionLoading,
    hasNextPage: extractionHasNextPage,
    loadNextPage: extractionLoadNextPage,
  } = useUserRequestsByCategoryApi({
    category: 'extraction',
    startDate,
    endDate,
  });

  // Automatically load all pages for each category
  useEffect(() => {
    if (!chatLoading && chatHasNextPage) {
      chatLoadNextPage();
    }
  }, [chatLoading, chatHasNextPage, chatLoadNextPage]);

  useEffect(() => {
    if (!documentLoading && documentHasNextPage) {
      documentLoadNextPage();
    }
  }, [documentLoading, documentHasNextPage, documentLoadNextPage]);

  useEffect(() => {
    if (!generationLoading && generationHasNextPage) {
      generationLoadNextPage();
    }
  }, [generationLoading, generationHasNextPage, generationLoadNextPage]);

  useEffect(() => {
    if (!extractionLoading && extractionHasNextPage) {
      extractionLoadNextPage();
    }
  }, [extractionLoading, extractionHasNextPage, extractionLoadNextPage]);

  const allRequests = useMemo(() => 
    [...chatRequests, ...documentRequests, ...generationRequests, ...extractionRequests],
    [chatRequests, documentRequests, generationRequests, extractionRequests]
  );

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 7);
    return { start, end };
  }, []);

  const minuteData = useMemo(() => 
    aggregateByMinute(allRequests, dateRange.start, dateRange.end),
    [allRequests, dateRange]
  );

  const heatmapData = useMemo(() => 
    createHeatmapData(allRequests),
    [allRequests]
  );

  const isLoading = chatLoading || documentLoading || generationLoading || extractionLoading;

  return (
    <div className="container p-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/statistics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">User Requests per Minute</h1>
          <p className="text-sm text-muted-foreground">Request volume over the last 7 days (10,080 minutes)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          <RequestsChart title="Requests per Minute (Zoomable)" data={minuteData} />
          <HeatmapChart data={heatmapData} />
        </div>
      )}
    </div>
  );
}

