import { useChatsByUserApi } from "./use-chats-by-user.api";
import { useChatsBySpaceApi } from "./use-chats-by-space.api";
import { useSessionContext, useSpaceContext } from "@/providers";

export const useChatsByUserOrSpaceApi = () => {
  const { userAttributes } = useSessionContext();
  const { spaceUuid } = useSpaceContext();

  const { chats: userChats, isLoading: isLoadingChats, hasNextPage: hasNextPageChats, loadNextPage: loadNextPageChats } = useChatsByUserApi({ userUuid: spaceUuid ? null : userAttributes?.userUuid || null, options: { perPage: 500, key: 'documents-browser', subscriptions: 'all' }, noDocumentOnly: false });
  const { chats: spaceChats, isLoading: isLoadingSpaceChats, hasNextPage: hasNextPageSpaceChats, loadNextPage: loadNextPageSpaceChats } = useChatsBySpaceApi({ spaceUuid: spaceUuid || null, options: { perPage: 500, key: 'documents-browser', subscriptions: 'all' } });

  return {
    chats: spaceUuid ? spaceChats : userChats,
    isLoading: spaceUuid ? isLoadingSpaceChats : isLoadingChats,
    hasNextPage: spaceUuid ? hasNextPageSpaceChats : hasNextPageChats,
    loadNextPage: spaceUuid ? loadNextPageSpaceChats : loadNextPageChats,
  };
}