import { useAmplifyApiClient, useAmplifyUserApiClient, useSessionContext } from "@/providers";
import { useItemApi } from "../use-item.api";
import { StudentDocument } from "@/lib/types";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Document scalars only — do not nest `space` / `chats` here: those models are API-key-only in the schema, so userPool nested reads return Unauthorized. */
const documentScalarSelection = [
  'documentUuid',
  'userUuid',
  'spaceUuid',
  'type',
  'fileName',
  'key',
  'originalKey',
  'documentCount',
  'hasRagEmbeddings',
  'youtubeVideoUuid',
  'createdAt',
  'updatedAt',
] as const;

async function enrichDocumentForViewer(
  apiClient: ReturnType<typeof useAmplifyApiClient>,
  documentUuid: string,
  spaceUuid: string | null | undefined,
  viewerUserUuid: string | undefined,
): Promise<{ spaceName: string | null; chatUuid: string | null }> {
  let spaceName: string | null = null;
  if (spaceUuid) {
    const spaceRes = await apiClient.models.Space.get(
      { spaceUuid },
      { selectionSet: ['name'] },
    );
    spaceName = spaceRes.data?.name ?? null;
  }

  let chatUuid: string | null = null;
  if (viewerUserUuid) {
    const chatsRes = await apiClient.models.Chat.listChatByDocumentUuidAndCreatedAt(
      { documentUuid },
      {
        filter: { userUuid: { eq: viewerUserUuid } },
        selectionSet: ['chatUuid', 'userUuid'],
        limit: 25,
        sortDirection: 'DESC',
      },
    );
    chatUuid = chatsRes.data?.[0]?.chatUuid ?? null;
  }

  return { spaceName, chatUuid };
}

export function useDocumentApi(documentUuid: string | null) {
  const userClient = useAmplifyUserApiClient();
  const apiClient = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const { userAttributes } = useSessionContext();

  const { data, isLoading } = useItemApi<StudentDocument>(documentUuid, {
    key: 'document',
    getItemFunc: async (itemUuid) => {
      const response = await userClient.models.Document.get({ documentUuid: itemUuid }, {
        selectionSet: [...documentScalarSelection],
      });

      if (!response.data) {
        return { data: null };
      }

      const { spaceName, chatUuid } = await enrichDocumentForViewer(
        apiClient,
        itemUuid,
        response.data.spaceUuid,
        userAttributes?.userUuid,
      );

      return {
        data: {
          ...response.data,
          spaceName,
          chatUuid,
        } as StudentDocument,
      };
    },
  });

  // Subscribe to updates for this document so UI reacts when key changes
  useEffect(() => {
    if (!documentUuid) return;

    const sub = userClient.models.Document.onUpdate({
      filter: { documentUuid: { eq: documentUuid } },
      selectionSet: [...documentScalarSelection],
    }).subscribe({
      next: (doc) => {
        enrichDocumentForViewer(apiClient, documentUuid, doc.spaceUuid, userAttributes?.userUuid).then(
          ({ spaceName, chatUuid }) => {
            const updated: StudentDocument = {
              ...doc,
              spaceName,
              chatUuid,
            } as StudentDocument;
            queryClient.setQueryData(['document', documentUuid], updated);
          },
        );
      },
    });

    return () => sub.unsubscribe();
  }, [userClient, apiClient, documentUuid, queryClient, userAttributes?.userUuid]);

  return {
    document: data,
    isLoading,
  };
}
