import { useAmplifyApiClient, useAmplifyUserApiClient } from "@/providers";
import { FlashcardDeck, FlashcardItem } from "@/lib/types";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { emitter } from "@/hooks/use-events";
import { usePathname } from "next/navigation";

type RequestType = Schema['FlashcardDeck']['type'];

type SubscriptionInputType = {
  documentUuid: string | null;
}

export function useFlashcardDecksByDocumentApi({
  documentUuid,
  options,
}: {
  documentUuid: string | null;
  options?: Pick<ByUserApiOptions, 'key'>;
}) {
  const client = useAmplifyApiClient();
  const userClient = useAmplifyUserApiClient();

  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);

  const updateDocumentSubscription = useCallback((input: SubscriptionInputType) => {
    if (!input.documentUuid) {
      // Return a no-op subscription when input is invalid
      return userClient.models.Document.onUpdate({
        filter: { documentUuid: { eq: '__invalid__' } },
      }).subscribe({
        next: () => {},
      });
    }
    return userClient.models.Document.onUpdate({
      filter: { documentUuid: { eq: input.documentUuid } },
    }).subscribe({
      next: async (data) => {
        // if the document is updating, download the flashcard deck
        if (data.flashcardDeckUuid) {
          const deckResponse = await client.models.FlashcardDeck.get({
            flashcardDeckUuid: data.flashcardDeckUuid
          });
          if (deckResponse.data) {
            setFlashcardDecks((prev) => [deckResponse.data as FlashcardDeck]);
          }
        }
      },
    });
  }, [client, userClient]);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.documentUuid;
  }, []);

  const subInput = useMemo(() => ({ documentUuid }), [documentUuid]); // Will be updated when we get the deck UUID from document
  useSubscription<SubscriptionInputType>({
    subscriptions: 'update',
    input: subInput,
    onValidate,
    updateFunc: updateDocumentSubscription,
  });

  const getFlashcardDecks = useCallback(async (documentUuid: string) => {
    // First get the document to find its flashcardDeckUuid
    const documentResponse = await userClient.models.Document.get({ documentUuid });
    if (!documentResponse.data?.flashcardDeckUuid) {
      return { data: [] };
    }

    // Then get the flashcard deck
    const deckResponse = await client.models.FlashcardDeck.get({
      flashcardDeckUuid: documentResponse.data.flashcardDeckUuid
    });

    return { data: deckResponse.data ? [deckResponse.data] : [] };
  }, [client, userClient]);

  const onData = useCallback((data: RequestType[]) => {
    const mapped = data.map((d) => ({
      ...d,
      flashcards: d.flashcards || [],
    })) as unknown as FlashcardDeck[];
    setFlashcardDecks(mapped);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['flashcard-decks', documentUuid!, options?.key || 'default'],
    queryFn: () => getFlashcardDecks(documentUuid!),
    options: {
      enabled: !!documentUuid,
      onData,
    },
  });

  // Extract flashcards from decks for backward compatibility
  const flashcards: FlashcardItem[] = useMemo(() => {
    return flashcardDecks.flatMap(deck => deck.flashcards || []);
  }, [flashcardDecks]);

  return {
    isLoading,
    flashcardDecks,
    flashcards: documentUuid ? flashcards : [], // Flattened for UI compatibility
  };
}

type ChatSubscriptionInputType = {
  chatUuid: string | null;
};

type DeckSubscriptionInputType = {
  deckUuid: string | null;
};

export function useFlashcardDecksByChatApi({
  chatUuid,
  options,
}: {
  chatUuid: string | null;
  options?: Pick<ByUserApiOptions, 'key'>;
}) {
  const client = useAmplifyApiClient();

  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);

  // Live refresh #1: the chat gains its first deck (flashcardDeckUuid set by
  // the chat agent after generating flashcards).
  const updateChatSubscription = useCallback((input: ChatSubscriptionInputType) => {
    return client.models.Chat.onUpdate({
      filter: { chatUuid: { eq: input.chatUuid! } },
    }).subscribe({
      next: async (data) => {
        if (!data.flashcardDeckUuid) return;
        const deckResponse = await client.models.FlashcardDeck.get({
          flashcardDeckUuid: data.flashcardDeckUuid,
        });
        if (deckResponse.data) {
          setFlashcardDecks([deckResponse.data as FlashcardDeck]);
        }
      },
    });
  }, [client]);

  const chatSubInput = useMemo(() => ({ chatUuid }), [chatUuid]);
  useSubscription<ChatSubscriptionInputType>({
    subscriptions: 'update',
    input: chatSubInput,
    onValidate: (input) => !!input.chatUuid,
    updateFunc: updateChatSubscription,
  });

  // Live refresh #2: new cards appended to an existing deck (only the deck row
  // is updated in that case, not the chat).
  const deckUuid = flashcardDecks[0]?.flashcardDeckUuid ?? null;

  const updateDeckSubscription = useCallback((input: DeckSubscriptionInputType) => {
    return client.models.FlashcardDeck.onUpdate({
      filter: { flashcardDeckUuid: { eq: input.deckUuid! } },
    }).subscribe({
      next: (data) => {
        if (!data) return;
        setFlashcardDecks([
          { ...data, flashcards: data.flashcards || [] } as unknown as FlashcardDeck,
        ]);
      },
    });
  }, [client]);

  const deckSubInput = useMemo(() => ({ deckUuid }), [deckUuid]);
  useSubscription<DeckSubscriptionInputType>({
    subscriptions: 'update',
    input: deckSubInput,
    onValidate: (input) => !!input.deckUuid,
    updateFunc: updateDeckSubscription,
  });

  const getFlashcardDecks = useCallback(async (chatUuid: string) => {
    // First get the chat to find its flashcardDeckUuid
    const chatResponse = await client.models.Chat.get({ chatUuid });
    if (!chatResponse.data?.flashcardDeckUuid) {
      return { data: [] };
    }

    // Then get the flashcard deck
    const deckResponse = await client.models.FlashcardDeck.get({
      flashcardDeckUuid: chatResponse.data.flashcardDeckUuid
    });

    return { data: deckResponse.data ? [deckResponse.data] : [] };
  }, [client]);

  const onData = useCallback((data: RequestType[]) => {
    const mapped = data.map((d) => ({
      ...d,
      flashcards: d.flashcards || [],
    })) as unknown as FlashcardDeck[];
    setFlashcardDecks(mapped);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['flashcard-decks', chatUuid!, options?.key || 'default'],
    queryFn: () => getFlashcardDecks(chatUuid!),
    options: {
      enabled: !!chatUuid,
      onData,
    },
  });

  // Extract flashcards from decks for backward compatibility
  const flashcards: FlashcardItem[] = useMemo(() => {
    return flashcardDecks.flatMap(deck => deck.flashcards || []);
  }, [flashcardDecks]);

  return {
    isLoading,
    flashcardDecks,
    flashcards: chatUuid ? flashcards : [], // Flattened for UI compatibility
  };
}

type DocumentResponseType = {
  data: {documentUuid: string; flashcardDeckUuid: string}[];
  nextToken: string | undefined;
};

type ChatResponseType = {
  data: {chatUuid: string; flashcardDeckUuid: string}[];
  nextToken: string | undefined;
};

export function useFlashcardDecksBySpaceApi({
  spaceUuid,
  options,
}: {
  spaceUuid: string | null;
  options?: Pick<ByUserApiOptions, 'key'>;
}) {
  const client = useAmplifyApiClient();
  const userClient = useAmplifyUserApiClient();
   const pathname = usePathname();

  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);

  const getFlashcardDecks = useCallback(async (spaceUuid: string) => {
    const decks: FlashcardDeck[] = [];

    // Get all documents in the space
    let documentNextToken: string | undefined = undefined;
    do {
      const documentsResponse = await userClient.models.Document.listDocumentBySpaceUuidAndCreatedAt({
        spaceUuid,
      }, {
        limit: 100,
        nextToken: documentNextToken,
      }) as DocumentResponseType;

      if (documentsResponse.data) {
        // Collect all flashcard deck UUIDs from documents
        const documentDeckUuids = documentsResponse.data
          .map(doc => doc.flashcardDeckUuid)
          .filter((uuid): uuid is string => !!uuid);

        // Fetch all flashcard decks from documents
        for (const deckUuid of documentDeckUuids) {
          const deckResponse = await client.models.FlashcardDeck.get({
            flashcardDeckUuid: deckUuid
          });
          if (deckResponse.data) {
            decks.push(deckResponse.data as FlashcardDeck);
          }
        }
      }

      documentNextToken = documentsResponse.nextToken || undefined;
    } while (documentNextToken);

    // Get all chats in the space
    let chatNextToken: string | undefined = undefined;
    do {
      const chatsResponse = await client.models.Chat.listChatBySpaceUuidAndCreatedAt({
        spaceUuid,
      }, {
        limit: 100,
        nextToken: chatNextToken,
      }) as ChatResponseType;

      if (chatsResponse.data) {
        // Collect all flashcard deck UUIDs from chats
        const chatDeckUuids = chatsResponse.data
          .map(chat => chat.flashcardDeckUuid)
          .filter((uuid): uuid is string => !!uuid);

        // Fetch all flashcard decks from chats
        for (const deckUuid of chatDeckUuids) {
          const deckResponse = await client.models.FlashcardDeck.get({
            flashcardDeckUuid: deckUuid
          });
          if (deckResponse.data) {
            // Avoid duplicates - check if deck already exists
            const existingDeck = decks.find(d => d.flashcardDeckUuid === deckResponse.data?.flashcardDeckUuid);
            if (!existingDeck) {
              decks.push(deckResponse.data as FlashcardDeck);
            }
          }
        }
      }

      chatNextToken = chatsResponse.nextToken || undefined;
    } while (chatNextToken);

    return { data: decks };
  }, [client, userClient]);

  const onData = useCallback((data: RequestType[]) => {
    const mapped = data.map((d) => ({
      ...d,
      flashcards: d.flashcards || [],
    })) as unknown as FlashcardDeck[];
    setFlashcardDecks(mapped);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['flashcard-decks', 'space', spaceUuid!, options?.key || 'default', pathname],
    queryFn: () => getFlashcardDecks(spaceUuid!),
    options: {
      enabled: !!spaceUuid,
      onData,
    },
  });

  // Extract flashcards from decks for backward compatibility
  const flashcards: FlashcardItem[] = useMemo(() => {
    return flashcardDecks.flatMap(deck => deck.flashcards || []);
  }, [flashcardDecks]);

  return {
    isLoading,
    flashcardDecks,
    flashcards, // Flattened for UI compatibility
  };
}