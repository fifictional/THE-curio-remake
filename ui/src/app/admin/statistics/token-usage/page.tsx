'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUserRequestsByCategoryApi } from "@/hooks/api/user-requests";
import { UserRequest } from "@/lib/types/user-request";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from "react";
import { subHours } from 'date-fns';

type PercentileData = {
  percentile: number;
  totalTokenCount: number;
  promptTokenCount: number;
  cachedContentTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  toolUsePromptTokenCount: number;
};

type UserTokens = {
  totalTokenCount: number;
  promptTokenCount: number;
  cachedContentTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  toolUsePromptTokenCount: number;
};

function aggregateByUser(requests: UserRequest[]): UserTokens[] {
  const userMap = new Map<string, UserTokens>();
  
  requests.forEach(request => {
    const existing = userMap.get(request.userUuid) || {
      totalTokenCount: 0,
      promptTokenCount: 0,
      cachedContentTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      toolUsePromptTokenCount: 0,
    };
    
    userMap.set(request.userUuid, {
      totalTokenCount: existing.totalTokenCount + request.totalTokenCount,
      promptTokenCount: existing.promptTokenCount + (request.promptTokenCount || 0),
      cachedContentTokenCount: existing.cachedContentTokenCount + (request.cachedContentTokenCount || 0),
      candidatesTokenCount: existing.candidatesTokenCount + (request.candidatesTokenCount || 0),
      thoughtsTokenCount: existing.thoughtsTokenCount + 0, // Not in current type, will be 0
      toolUsePromptTokenCount: existing.toolUsePromptTokenCount + 0, // Not in current type, will be 0
    });
  });
  
  return Array.from(userMap.values());
}

function calculatePercentileValue(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculatePercentilesForUsers(userTokens: UserTokens[]): PercentileData[] {
  if (userTokens.length === 0) {
    // Return empty data for all percentiles
    return Array.from({ length: 101 }, (_, i) => ({
      percentile: i,
      totalTokenCount: 0,
      promptTokenCount: 0,
      cachedContentTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      toolUsePromptTokenCount: 0,
    }));
  }
  
  // Extract arrays for each token type
  const totalTokens = userTokens.map(u => u.totalTokenCount);
  const promptTokens = userTokens.map(u => u.promptTokenCount);
  const cachedTokens = userTokens.map(u => u.cachedContentTokenCount);
  const candidatesTokens = userTokens.map(u => u.candidatesTokenCount);
  const thoughtsTokens = userTokens.map(u => u.thoughtsTokenCount);
  const toolUseTokens = userTokens.map(u => u.toolUsePromptTokenCount);
  
  // Calculate percentile for each percentage point (0-100)
  return Array.from({ length: 101 }, (_, i) => ({
    percentile: i,
    totalTokenCount: calculatePercentileValue(totalTokens, i),
    promptTokenCount: calculatePercentileValue(promptTokens, i),
    cachedContentTokenCount: calculatePercentileValue(cachedTokens, i),
    candidatesTokenCount: calculatePercentileValue(candidatesTokens, i),
    thoughtsTokenCount: calculatePercentileValue(thoughtsTokens, i),
    toolUsePromptTokenCount: calculatePercentileValue(toolUseTokens, i),
  }));
}

function TokenUsageChart({ title, data, userCount }: { title: string; data: PercentileData[]; userCount: number }) {
  // Show every 10th label for readability
  const tickFormatter = (value: number) => {
    return value % 10 === 0 ? `${value}%` : '';
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{userCount} users</span>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="percentile" 
              tickFormatter={tickFormatter}
              label={{ value: 'Percentile', position: 'insideBottom', offset: -5 }}
            />
            <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number) => value.toLocaleString()}
              labelFormatter={(label) => `${label}th percentile`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalTokenCount"
              name="Total Tokens"
              stroke="#1e40af"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="promptTokenCount"
              name="Prompt Tokens"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cachedContentTokenCount"
              name="Cached Tokens"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="candidatesTokenCount"
              name="Candidate Tokens"
              stroke="#ffc658"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="thoughtsTokenCount"
              name="Thoughts Tokens"
              stroke="#ff7300"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="toolUsePromptTokenCount"
              name="Tool Use Tokens"
              stroke="#d946ef"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function TokenUsagePage() {
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

  const allUserTokens = useMemo(() => 
    aggregateByUser([...chatRequests, ...documentRequests, ...generationRequests, ...extractionRequests]),
    [chatRequests, documentRequests, generationRequests, extractionRequests]
  );

  const chatUserTokens = useMemo(() => aggregateByUser(chatRequests), [chatRequests]);
  const documentUserTokens = useMemo(() => aggregateByUser(documentRequests), [documentRequests]);
  const generationUserTokens = useMemo(() => aggregateByUser(generationRequests), [generationRequests]);
  const extractionUserTokens = useMemo(() => aggregateByUser(extractionRequests), [extractionRequests]);

  const allData = useMemo(() => calculatePercentilesForUsers(allUserTokens), [allUserTokens]);
  const chatData = useMemo(() => calculatePercentilesForUsers(chatUserTokens), [chatUserTokens]);
  const documentData = useMemo(() => calculatePercentilesForUsers(documentUserTokens), [documentUserTokens]);
  const generationData = useMemo(() => calculatePercentilesForUsers(generationUserTokens), [generationUserTokens]);
  const extractionData = useMemo(() => calculatePercentilesForUsers(extractionUserTokens), [extractionUserTokens]);

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
          <h1 className="text-2xl font-semibold">Token Usage Per User</h1>
          <p className="text-sm text-muted-foreground">Hourly token consumption distribution for rate limiting analysis</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          <TokenUsageChart title="All Requests" data={allData} userCount={allUserTokens.length} />
          <TokenUsageChart title="Chat" data={chatData} userCount={chatUserTokens.length} />
          <TokenUsageChart title="Document Processing" data={documentData} userCount={documentUserTokens.length} />
          <TokenUsageChart title="Generated Content" data={generationData} userCount={generationUserTokens.length} />
          <TokenUsageChart title="Extraction" data={extractionData} userCount={extractionUserTokens.length} />
        </div>
      )}
    </div>
  );
}

