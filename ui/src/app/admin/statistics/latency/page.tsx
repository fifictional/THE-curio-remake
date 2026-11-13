'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUserRequestsByCategoryApi } from "@/hooks/api/user-requests";
import { UserRequest } from "@/lib/types/user-request";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from "react";
import { subHours, startOfMinute, format } from 'date-fns';

type MinuteData = {
  minute: string;
  timestamp: Date;
  average: number;
  max: number;
  p95: number;
};

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function aggregateByMinute(requests: UserRequest[]): MinuteData[] {
  const now = new Date();
  const oneHourAgo = subHours(now, 1);
  
  // Create 60 minute buckets
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < 60; i++) {
    const minute = new Date(oneHourAgo.getTime() + i * 60000);
    const minuteKey = startOfMinute(minute).toISOString();
    buckets.set(minuteKey, []);
  }
  
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
      average: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      max: latencies.length > 0 ? Math.max(...latencies) : 0,
      p95: calculatePercentile(latencies, 95),
    };
  });
}

function LatencyChart({ title, data }: { title: string; data: MinuteData[] }) {
  // Show every 5th label for readability
  const tickFormatter = (value: string, index: number) => {
    return index % 5 === 0 ? value : '';
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="minute" 
              tickFormatter={tickFormatter}
            />
            <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number) => value.toFixed(2) + 's'}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="average"
              name="Average"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="max"
              name="Max"
              stroke="#ff7300"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="p95"
              name="95th Percentile"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function LatencyPage() {
  const startDate = useMemo(() => subHours(new Date(), 1).toISOString(), []);
  const endDate = useMemo(() => new Date().toISOString(), []);

  const { userRequests: chatRequests, isLoading: chatLoading } = useUserRequestsByCategoryApi({
    category: 'chat',
    startDate,
    endDate,
  });

  const { userRequests: documentRequests, isLoading: documentLoading } = useUserRequestsByCategoryApi({
    category: 'document',
    startDate,
    endDate,
  });

  const { userRequests: generationRequests, isLoading: generationLoading } = useUserRequestsByCategoryApi({
    category: 'generation',
    startDate,
    endDate,
  });

  const { userRequests: extractionRequests, isLoading: extractionLoading } = useUserRequestsByCategoryApi({
    category: 'extraction',
    startDate,
    endDate,
  });

  const allData = useMemo(() => 
    aggregateByMinute([...chatRequests, ...documentRequests, ...generationRequests, ...extractionRequests]),
    [chatRequests, documentRequests, generationRequests, extractionRequests]
  );

  const chatData = useMemo(() => aggregateByMinute(chatRequests), [chatRequests]);
  const documentData = useMemo(() => aggregateByMinute(documentRequests), [documentRequests]);
  const generationData = useMemo(() => aggregateByMinute(generationRequests), [generationRequests]);
  const extractionData = useMemo(() => aggregateByMinute(extractionRequests), [extractionRequests]);

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
          <h1 className="text-2xl font-semibold">AI Call Latency</h1>
          <p className="text-sm text-muted-foreground">Monitor response times and performance metrics (Last Hour)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          <LatencyChart title="All Requests" data={allData} />
          <LatencyChart title="Chat" data={chatData} />
          <LatencyChart title="Document Processing" data={documentData} />
          <LatencyChart title="Generated Content" data={generationData} />
          <LatencyChart title="Extraction" data={extractionData} />
        </div>
      )}
    </div>
  );
}

