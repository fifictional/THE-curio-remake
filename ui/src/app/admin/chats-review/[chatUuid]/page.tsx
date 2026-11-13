"use client";

import { useParams } from "next/navigation";
import { useMessagesByChatApi } from "@/hooks/api/chats/use-messages-by-chat.api";
import { type OpenChatArgs } from "@/hooks/api/chats/types";
import { useEffect, useMemo, useRef } from "react";
import { CurioMarkdown } from "@/components/core/curio-markdown";

export default function ChatConversationPage() {
  const { chatUuid } = useParams();
  const chatArgs: OpenChatArgs = { chatUuid: chatUuid as string, webSearch: false };
  const { messages, isLoading, hasNextPage, loadNextPage } = useMessagesByChatApi({
    chatUuid: chatUuid as string,
    chatType: 'main',
    chatArgs,
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasNextPage && !isLoading) {
          loadNextPage();
        }
      });
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isLoading, loadNextPage]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Chat {chatUuid}</h1>
      <div className="w-full flex gap-4 flex-col">
        {messages.map((m) => (
          <div key={m.messageUuid} className="p-3 text-sm w-full bg-focus rounded-md">
            <div className="text-xs text-muted-foreground mb-1">
              {m.role} • {new Date(m.createdAt).toLocaleString()}
              {m.vote === 'up' && <span className="ml-2 text-emerald-600">👍</span>}
              {m.vote === 'down' && <span className="ml-2 text-red-600">👎</span>}
            </div>
            <div><CurioMarkdown content={m.content} /></div>
          </div>
        ))}
        <div ref={sentinelRef} className="h-10" />
      </div>
      {isLoading && <div className="text-sm text-muted-foreground mt-3">Loading…</div>}
    </div>
  );
}

