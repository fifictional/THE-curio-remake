import { useChatCitationsApi } from "@/hooks/api/chats/use-chat-citations.api";
import { SpaceSources } from "../space-sources";
import { useChatContext } from "@/providers";

export function SpaceSourcesAsTab() {
  const { chatUuid } = useChatContext();
  const { citations, isLoading: isChatCitationsLoading } = useChatCitationsApi({ chatUuid: chatUuid || null });

  return <SpaceSources isChatCitationsLoading={isChatCitationsLoading} citations={citations} />
}
