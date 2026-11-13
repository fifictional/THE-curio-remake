import { useDocumentsByUserApi } from "./use-documents-by-user.api";
import { useDocumentsBySpaceApi } from "./use-documents-by-space.api";
import { useSessionContext, useSpaceContext } from "@/providers";

export const useDocumentsByUserOrSpaceApi = () => {
  const { userAttributes } = useSessionContext();
  const { spaceUuid } = useSpaceContext();

  const { documents, isLoading: isLoadingFiles, hasNextPage, loadNextPage, removeDocument: removeDocumentFromUser } = useDocumentsByUserApi({ userUuid: spaceUuid ? null : userAttributes?.userUuid || null, options: { perPage: 500, subscriptions: 'all', key: 'home' } });
  const { documents: spaceDocuments, isLoading: isLoadingSpaceFiles, hasNextPage: hasNextPageSpace, loadNextPage: loadNextPageSpace, removeDocument: removeDocumentFromSpace } = useDocumentsBySpaceApi({ spaceUuid: spaceUuid || null, options: { perPage: 500, subscriptions: 'all', key: 'space-home' } });

  return {
    documents: spaceUuid ? spaceDocuments : documents,
    isLoading: spaceUuid ? isLoadingSpaceFiles : isLoadingFiles,
    hasNextPage: spaceUuid ? hasNextPageSpace : hasNextPage,
    loadNextPage: spaceUuid ? loadNextPageSpace : loadNextPage,
    removeDocument: spaceUuid ? removeDocumentFromSpace : removeDocumentFromUser,
  };
}