'use client';

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Timer, Coins, BarChart3, FileText, MessageSquare, FileQuestion, BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function StatisticsPage() {
  return (
    <div className="container p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Statistics Hub</h1>
          <p className="text-sm text-muted-foreground">AI token usage and system metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/statistics/token-usage"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Coins className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Token Usage</span>
              <span className="text-sm text-muted-foreground">Analyze token consumption</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/latency"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Timer className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">AI Call Latency</span>
              <span className="text-sm text-muted-foreground">Monitor response times</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/rate-limits"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Activity className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Rate Limits</span>
              <span className="text-sm text-muted-foreground">Check API rate limits</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/user-requests"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">User Requests</span>
              <span className="text-sm text-muted-foreground">Request volume & patterns</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/document-analytics"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Document Analytics</span>
              <span className="text-sm text-muted-foreground">Processing time metrics</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/chat-metrics"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Chat Performance Metrics</span>
              <span className="text-sm text-muted-foreground">Message volume & response times</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/quiz-metrics"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <FileQuestion className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Quiz Performance Metrics</span>
              <span className="text-sm text-muted-foreground">Quiz generation volume & error rates</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/document-subjects"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Document Subjects</span>
              <span className="text-sm text-muted-foreground">Subject & document type breakdown</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/statistics/document-types"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Layers className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Document Types</span>
              <span className="text-sm text-muted-foreground">Document type & subject breakdown</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

