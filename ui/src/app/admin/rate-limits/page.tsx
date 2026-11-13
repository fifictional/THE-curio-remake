'use client';

import { useMemo } from "react";
import { useUserRequestsApi } from "@/hooks/api/user-requests";
import { UserRequest } from "@/lib/types/user-request";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, endOfDay, startOfDay } from 'date-fns';
import { useSessionContext } from "@/providers";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function processData(requests: UserRequest[], days: number) {
  const data = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), i);

    return {
      date: format(date, 'MM/dd'),
      chatRequests: requests.filter(r => r.documentUuid === null && r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).length,
      chatTokens: requests.filter(r => r.documentUuid === null && r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).reduce((acc, r) => acc + r.totalTokenCount, 0),
      docRequests: requests.filter(r => r.documentUuid !== null && r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).length,
      docTokens: requests.filter(r => r.documentUuid !== null && r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).reduce((acc, r) => acc + r.totalTokenCount, 0),
      totalRequests: requests.filter(r => r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).length,
      totalTokens: requests.filter(r => r.createdAt >= startOfDay(date).toISOString() && r.createdAt < endOfDay(date).toISOString()).reduce((acc, r) => acc + r.totalTokenCount, 0),
    };
  }).reverse();

  return data;
}

function MetricChart({ data, metrics, title }: { data: any[], metrics: { key: string, name: string, color: string }[], title: string }) {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {metrics.map(metric => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.name}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ModelChart({ requests, model, title }: { requests: UserRequest[], model: string, title: string }) {
  const data = processData(requests.filter(r => r.model === model), 7);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <MetricChart
      title={`Requests per Day ${title}`}
      data={data}
      metrics={[
        { key: 'chatRequests', name: 'Chat Requests', color: '#8884d8' },
        { key: 'docRequests', name: 'Document Requests', color: '#82ca9d' },
        { key: 'totalRequests', name: 'Total Requests', color: '#ffc658' }
      ]}
    />

    <MetricChart
      title={`Tokens per Day ${title}`}
      data={data}
      metrics={[
        { key: 'chatTokens', name: 'Chat Tokens', color: '#8884d8' },
        { key: 'docTokens', name: 'Document Tokens', color: '#82ca9d' },
        { key: 'totalTokens', name: 'Total Tokens', color: '#ffc658' }
      ]}
    />
  </div>
  );
}

export default function RateLimitsPage() {
  const { userAttributes } = useSessionContext();
  const { userRequests } = useUserRequestsApi({
    userUuid: userAttributes?.userUuid || null,
    startDate: startOfDay(subDays(new Date(), 7)).toISOString(),
    endDate: endOfDay(new Date()).toISOString(),
  });

  const requestGPT5 = useMemo(() => userRequests.filter(r => r.model === 'gpt-5' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGPT41 = useMemo(() => userRequests.filter(r => r.model === 'gpt-4.1' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGPT4o = useMemo(() => userRequests.filter(r => r.model === 'gpt-4o' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGPT5Mini = useMemo(() => userRequests.filter(r => r.model === 'gpt-5-mini' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGPT4oMini = useMemo(() => userRequests.filter(r => r.model === 'gpt-4o-mini' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGPT35Turbo = useMemo(() => userRequests.filter(r => r.model === 'gpt-3.5-turbo' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);
  const requestGemini25Flash = useMemo(() => userRequests.filter(r => r.model === 'gemini-2.5-flash' && r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()), [userRequests]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/statistics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Rate Limits & Usage Metrics</h2>
          <p className="text-sm text-muted-foreground">Monitor API usage and rate limits</p>
        </div>
      </div>

      {/* immediate data */}
      {/* show total numbers for today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Requests Today</h3>
          <p className="text-2xl font-bold">Total: {userRequests.filter(r => r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()).length}</p>
          <p className="text-2xl font-bold">gpt-5: {requestGPT5.length}</p>
          <p className="text-2xl font-bold">gpt-4.1: {requestGPT41.length}</p>
          <p className="text-2xl font-bold">gpt-5-mini: {requestGPT5Mini.length}</p>
          <p className="text-2xl font-bold">gpt-4o: {requestGPT4o.length}</p>
          <p className="text-2xl font-bold">gpt-4o-mini: {requestGPT4oMini.length}</p>
          <p className="text-2xl font-bold">gpt-3.5-turbo: {requestGPT35Turbo.length}</p>
          <p className="text-2xl font-bold">gemini-2.5-flash: {requestGemini25Flash.length}</p>
          <p className="text-2xl font-bold">429 today: {userRequests.filter(r => r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString() && r.requestStatus === 429).length}</p>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Tokens Today</h3>
          <p className="text-2xl font-bold">Total: {userRequests.filter(r => r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString()).reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-5: {requestGPT5.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-4.1: {requestGPT41.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-5-mini: {requestGPT5Mini.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-4o: {requestGPT4o.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-4o-mini: {requestGPT4oMini.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gpt-3.5-turbo: {requestGPT35Turbo.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">gemini-2.5-flash: {requestGemini25Flash.reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
          <p className="text-2xl font-bold">429 today: {userRequests.filter(r => r.createdAt >= startOfDay(new Date()).toISOString() && r.createdAt < endOfDay(new Date()).toISOString() && r.requestStatus === 429).reduce((acc, r) => acc + r.totalTokenCount, 0)}</p>
        </div>
      </div>

      <ModelChart requests={userRequests} model="gpt-5" title="GPT 5" />
      <ModelChart requests={userRequests} model="gpt-5-mini" title="GPT 5 Mini" />
      <ModelChart requests={userRequests} model="gpt-4.1" title="GPT 4.1" />
      <ModelChart requests={userRequests} model="gpt-4o" title="GPT 4.0" />
      <ModelChart requests={userRequests} model="gpt-4o-mini" title="GPT 4.0 Mini" />
      <ModelChart requests={userRequests} model="gpt-3.5-turbo" title="GPT 3.5 Turbo" />
      <ModelChart requests={userRequests} model="gemini-2.5-flash" title="Gemini 2.5 Flash" />
    </div>
  );
}