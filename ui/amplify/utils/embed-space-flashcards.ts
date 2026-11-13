import type { Schema } from "@database-schema";
import { generateClient } from "aws-amplify/api";
import { deleteSpaceChunks } from "./opensearchClient";
import { embedFlashcardContent } from "./document-embedding";

/**
 * Fetch all flashcards for a space (from documents + chats) and embed them into OpenSearch.
 * Used by both the batch job mutator and the on-demand Lambda.
 */
export async function embedFlashcardsForSpace(
  client: ReturnType<typeof generateClient<Schema>>,
  spaceUuid: string,
  userUuid: string
): Promise<{ embedded: number }> {
  const flashcards: Array<{ title: string; content: string; documentUuid: string }> = [];

  let docToken: string | undefined;
  do {
    const docRes = await client.models.Document.list({
      limit: 100,
      nextToken: docToken,
      filter: {
        and: [
          { spaceUuid: { eq: spaceUuid } },
          { flashcardDeckUuid: { attributeExists: true } },
        ],
      },
      selectionSet: ["documentUuid", "flashcardDeckUuid"],
    });

    for (const doc of docRes.data || []) {
      if (doc.flashcardDeckUuid) {
        const deckRes = await client.models.FlashcardDeck.get({
          flashcardDeckUuid: doc.flashcardDeckUuid,
        });
        const items = deckRes.data?.flashcards || [];
        const docUuid = doc.documentUuid ?? "";
        for (const item of items) {
          if (item?.title && item?.content) {
            flashcards.push({ title: item.title, content: item.content, documentUuid: docUuid });
          }
        }
      }
    }
    docToken = docRes.nextToken ?? undefined;
  } while (docToken);

  let chatToken: string | undefined;
  do {
    const chatRes = await client.models.Chat.list({
      limit: 100,
      nextToken: chatToken,
      filter: {
        and: [
          { spaceUuid: { eq: spaceUuid } },
          { flashcardDeckUuid: { attributeExists: true } },
        ],
      },
      selectionSet: ["documentUuid", "flashcardDeckUuid"],
    });

    for (const chat of chatRes.data || []) {
      if (chat.flashcardDeckUuid) {
        const deckRes = await client.models.FlashcardDeck.get({
          flashcardDeckUuid: chat.flashcardDeckUuid,
        });
        const items = deckRes.data?.flashcards || [];
        const docUuid = chat.documentUuid ?? "";
        for (const item of items) {
          if (item?.title && item?.content) {
            flashcards.push({ title: item.title, content: item.content, documentUuid: docUuid });
          }
        }
      }
    }
    chatToken = chatRes.nextToken ?? undefined;
  } while (chatToken);

  if (flashcards.length === 0) {
    await deleteSpaceChunks(userUuid, spaceUuid, "flashcard");
    return { embedded: 0 };
  }

  await embedFlashcardContent(userUuid, spaceUuid, flashcards);
  return { embedded: flashcards.length };
}
