"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAmplifyUserApiClient } from "@/providers/amplify-provider";
import { Loader2, Plus } from "lucide-react";

const navigation = [
  { name: "Subjects", href: "/admin/knowledge-base/subjects" },
  { name: "Topics", href: "/admin/knowledge-base/topics" },
  { name: "Concepts", href: "/admin/knowledge-base/concepts" },
  { name: "Terms", href: "/admin/knowledge-base/terms" },
  { name: "Exams", href: "/admin/knowledge-base/exams" },
];

export default function TopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const userClient = useAmplifyUserApiClient();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDefaultNodes = async () => {
    setIsCreating(true);
    try {
      const response = await userClient.mutations.createDefaultKnowledgeBaseNodes();
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message || 'Failed to create default nodes');
      }
      const data = response.data;
      alert(`Successfully created default nodes!\n${data?.message || ''}`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to create default nodes:', error);
      alert(`Failed to create default nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Manage subjects, topics, concepts, and terms (graph store decommissioned — read-only stubs)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleCreateDefaultNodes}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Default Nodes
              </>
            )}
          </Button>
        </div>
      </div>

      <nav className="flex space-x-1 border-b">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
