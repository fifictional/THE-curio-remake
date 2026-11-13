'use client';

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitMerge, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ToolsPage() {
  return (
    <div className="container p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Tools</h1>
          <p className="text-sm text-muted-foreground">Administrative tools and utilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/tools/ai-playground"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">AI Playground</span>
              <span className="text-sm text-muted-foreground">Direct access to AI models</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/tools/merge-duplicate-users"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 px-2">
              <GitMerge className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Merge duplicate users</span>
              <span className="text-sm text-muted-foreground">Upload JSON, dry-run or apply</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

