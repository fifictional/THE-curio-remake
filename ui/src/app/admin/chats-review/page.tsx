"use client";

import { useMemo, useState } from "react";
import { useChatListApi } from "@/hooks/api/chats/use-chat-list.api";
import { useChatListByUserApi } from "@/hooks/api/chats/use-chat-list-by-user.api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AdminChatRow } from "./types";
import { Search, X } from "lucide-react";

export default function ChatsReviewPage() {
  const [searchUserUuid, setSearchUserUuid] = useState<string>("");
  const [activeUserUuid, setActiveUserUuid] = useState<string | null>(null);
  
  const { chats: allChats, isLoading: isLoadingAll, hasNextPage: hasNextPageAll, loadNextPage: loadNextPageAll } = useChatListApi();
  const { chats: userChats, isLoading: isLoadingUser, hasNextPage: hasNextPageUser, loadNextPage: loadNextPageUser } = useChatListByUserApi(activeUserUuid);
  
  const chats = activeUserUuid ? userChats : allChats;
  const isLoading = activeUserUuid ? isLoadingUser : isLoadingAll;
  const hasNextPage = activeUserUuid ? hasNextPageUser : hasNextPageAll;
  const loadNextPage = activeUserUuid ? loadNextPageUser : loadNextPageAll;
  
  const flatRows = useMemo<AdminChatRow[]>(() => (chats?.pages?.flatMap((p: any) => p.data) ?? []), [chats]);

  const handleSearch = () => {
    if (searchUserUuid.trim()) {
      setActiveUserUuid(searchUserUuid.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchUserUuid("");
    setActiveUserUuid(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Chats Review</h1>
      
      {/* Search by User UUID */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search by User UUID..."
          value={searchUserUuid}
          onChange={(e) => setSearchUserUuid(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="max-w-md"
        />
        <Button onClick={handleSearch} disabled={!searchUserUuid.trim()}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        {activeUserUuid && (
          <Button onClick={handleClearSearch} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {activeUserUuid && (
        <div className="mb-4 text-sm text-muted-foreground">
          Showing chats for user: <span className="font-mono font-semibold">{activeUserUuid}</span>
        </div>
      )}

      <div className="w-full overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <TableHeaders />
          <TableBody flatRows={flatRows} />
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={() => loadNextPage()}
          disabled={isLoading || !hasNextPage}
        >
          {isLoading ? 'Loading…' : hasNextPage ? 'Load more' : 'No more results'}
        </button>
      </div>
    </div>
  );
}

const TableHeaders = () => {
  return (
    <thead className="bg-muted/50">
      <tr>
        <th className="text-left px-3 py-2">Name</th>
        <th className="text-left px-3 py-2">Messages</th>
        <th className="text-left px-3 py-2">Last message</th>
        <th className="text-left px-3 py-2">Folder</th>
        <th className="text-left px-3 py-2">Flags</th>
      </tr>
    </thead>
  );
};

const TableBody = ({ flatRows }: { flatRows: AdminChatRow[] }) => {
  return (
    <tbody>
      {flatRows.map((chat) => {
        const messageCount = chat.messages.length;
        const lastMessageAt = chat.messages[messageCount - 1]?.createdAt ?? chat.updatedAt;
        return (
          <tr key={chat.chatUuid} className="border-t">
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/admin/chats-review/${chat.chatUuid}`} className="font-medium truncate max-w-[28ch] hover:underline" title={chat.name || chat.chatUuid}>
                  {chat.name || "(no name)"}
                </Link>
                {chat.hasThumbsUp && <Badge variant="secondary">👍</Badge>}
                {chat.hasThumbsDown && <Badge variant="destructive">👎</Badge>}
                {chat.isOpenChat && <Badge>Open chat</Badge>}
              </div>
            </td>
            <td className="px-3 py-2">{messageCount}</td>
            <td className="px-3 py-2">{new Date(lastMessageAt).toLocaleString()}</td>
            <td className="px-3 py-2">{chat.spaceName}</td>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                {chat.isWebSearchCalled && <Badge variant="outline">Web</Badge>}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  )
};