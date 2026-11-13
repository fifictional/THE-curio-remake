'use client';

import { buttonVariants } from "@/components/ui/button";
import { Code2, Users, DollarSign, Package, BarChart3, Handshake, PlaySquare, Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  return (
    <div className="container p-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/statistics"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Statistics Hub</span>
              <span className="text-sm text-muted-foreground">AI token usage & metrics</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/prompt-editor"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Prompt Editor</span>
              <span className="text-sm text-muted-foreground">Manage AI prompts</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/bundles"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <DollarSign className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Bundles</span>
              <span className="text-sm text-muted-foreground">Manage bundles</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/purchases"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Bundle Ownership</span>
              <span className="text-sm text-muted-foreground">Grant or revoke purchased bundles</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/subscriptions"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Subscriptions</span>
              <span className="text-sm text-muted-foreground">Manage subscriptions</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/app-settings"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">App Settings</span>
              <span className="text-sm text-muted-foreground">Manage app settings</span>
            </div>
          </div>
        </Link>
        
        <Link
          href="/admin/mock-docs"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Mock Docs</span>
              <span className="text-sm text-muted-foreground">Manage mock docs</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/exam-modules"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Exam Modules</span>
              <span className="text-sm text-muted-foreground">Manage exam modules</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/chats-review"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Users className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Chats Review</span>
              <span className="text-sm text-muted-foreground">Manage chats review</span>
            </div>
          </div>
        </Link>
              
        <Link
          href="/admin/question-extractor"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Question Extractor</span>
              <span className="text-sm text-muted-foreground">Extract questions from exam papers</span>
            </div>
          </div>
        </Link>      

        <Link
          href="/admin/question-generator"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Package className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Question Generator</span>
              <span className="text-sm text-muted-foreground">Generate questions from prompts</span>
            </div>
          </div>
        </Link>
       
        <Link
          href="/admin/knowledge-base"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Code2 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Knowledge Base</span>
              <span className="text-sm text-muted-foreground">Manage knowledge base</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/user-knowledge-graph"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">User Knowledge Graph</span>
              <span className="text-sm text-muted-foreground">View user mastery levels</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/partnerships"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Handshake className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Partnerships</span>
              <span className="text-sm text-muted-foreground">Manage partners & users</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/batch-processing"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <PlaySquare className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Batch Processing</span>
              <span className="text-sm text-muted-foreground">Trigger & monitor batch jobs</span>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/tools"
          prefetch={false}
          className={cn(buttonVariants({ variant: 'outline' }), "h-32 relative group hover:border-primary")}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Wrench className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="block font-medium">Tools</span>
              <span className="text-sm text-muted-foreground">Administrative tools & utilities</span>
            </div>
          </div>
        </Link>         
              
      </div>
    </div>
  );
}
