import { NextRequest, NextResponse } from "next/server";
import { cookieBasedClient } from "@/lib/ssr/utils";
import { v4 as uuidv4 } from "uuid";

interface ChatAddFlashcardApiProps {
  messageUuid: string;
  userUuid: string;
  spaceUuid: string | null;
  documentUuid: string | null;
  chatUuid: string | null;
  flashcards: { title: string; content: string }[];
}

export async function POST(req: NextRequest) {
  const { userUuid, messageUuid, spaceUuid, documentUuid, chatUuid, flashcards } = await req.json() as ChatAddFlashcardApiProps;

  // update the message with the tool extra creation status
  const updateMessageResponse = await cookieBasedClient.models.Message.update({
    messageUuid,
    toolExtras: {
      userAction: true,
      isLoading: true,
    },
  });
  if (updateMessageResponse.errors) {
    console.error('Error updating message', updateMessageResponse.errors);
    return NextResponse.json({
      success: false,
      error: updateMessageResponse.errors[0].message,
    });
  }

  const now = new Date().toISOString();

  // Convert flashcards to FlashcardItem format
  const flashcardItems = flashcards.map(flashcard => ({
    flashcardUuid: uuidv4(),
    title: flashcard.title,
    content: flashcard.content,
    createdAt: now,
    updatedAt: now,
  }));

  // Determine the target (document or chat) and create/update the flashcard deck
  let targetEntity: 'document' | 'chat' | null = null;
  let targetUuid: string | null = null;
  let existingDeckUuid: string | null = null;

  if (documentUuid) {
    targetEntity = 'document';
    targetUuid = documentUuid;
    // Check if document already has a flashcard deck
    const docResponse = await cookieBasedClient.models.Document.get({ documentUuid });
    existingDeckUuid = docResponse.data?.flashcardDeckUuid || null;
  } else if (chatUuid) {
    targetEntity = 'chat';
    targetUuid = chatUuid;
    // Check if chat already has a flashcard deck
    const chatResponse = await cookieBasedClient.models.Chat.get({ chatUuid });
    existingDeckUuid = chatResponse.data?.flashcardDeckUuid || null;
  }

  let deckUuid: string;
  if (existingDeckUuid) {
    // Update existing deck by adding flashcards
    const existingDeckResponse = await cookieBasedClient.models.FlashcardDeck.get({
      flashcardDeckUuid: existingDeckUuid
    });

    if (existingDeckResponse.data) {
      const updatedFlashcards = [
        ...(existingDeckResponse.data.flashcards || []),
        ...flashcardItems
      ];

      const updateResponse = await cookieBasedClient.models.FlashcardDeck.update({
        flashcardDeckUuid: existingDeckUuid,
        flashcards: updatedFlashcards,
        updatedAt: now,
      });

      if (updateResponse.errors) {
        console.error('Error updating flashcard deck', updateResponse.errors);
        await cookieBasedClient.models.Message.update({
          messageUuid,
          toolExtras: {
            userAction: false,
            isLoading: false,
            success: false,
            errors: updateResponse.errors,
          },
        });
        return NextResponse.json({
          success: false,
        });
      }

      deckUuid = existingDeckUuid;
    } else {
      // Deck doesn't exist, create new one
      deckUuid = uuidv4();
      const createResponse = await cookieBasedClient.models.FlashcardDeck.create({
        flashcardDeckUuid: deckUuid,
        userUuid: userUuid,
        flashcards: flashcardItems,
        createdAt: now,
        updatedAt: now,
      });

      if (createResponse.errors) {
        console.error('Error creating flashcard deck', createResponse.errors);
        await cookieBasedClient.models.Message.update({
          messageUuid,
          toolExtras: {
            userAction: false,
            isLoading: false,
            success: false,
            errors: createResponse.errors,
          },
        });
        return NextResponse.json({
          success: false,
        });
      }
    }
  } else {
    // Create new flashcard deck
    deckUuid = uuidv4();
    const createResponse = await cookieBasedClient.models.FlashcardDeck.create({
      flashcardDeckUuid: deckUuid,
      userUuid: userUuid,
      flashcards: flashcardItems,
      createdAt: now,
      updatedAt: now,
    });

    if (createResponse.errors) {
      console.error('Error creating flashcard deck', createResponse.errors);
      await cookieBasedClient.models.Message.update({
        messageUuid,
        toolExtras: {
          userAction: false,
          isLoading: false,
          success: false,
          errors: createResponse.errors,
        },
      });
      return NextResponse.json({
        success: false,
      });
    }
  }

  // Update the target entity (document or chat) to reference the deck
  if (targetEntity === 'document' && targetUuid) {
    await cookieBasedClient.models.Document.update({
      documentUuid: targetUuid,
      flashcardDeckUuid: deckUuid,
    });
  } else if (targetEntity === 'chat' && targetUuid) {
    await cookieBasedClient.models.Chat.update({
      chatUuid: targetUuid,
      flashcardDeckUuid: deckUuid,
      hasFlashcardsOrQuizzes: true,
    });
  }

  await cookieBasedClient.models.Message.update({
    messageUuid,
    toolExtras: {
      userAction: false,
      isLoading: false,
      success: true,
    },
  });

  // EOPRD-813: Embed flashcards immediately when in a space
  let embedSpaceUuid = spaceUuid;
  if (!embedSpaceUuid && targetEntity === "document" && targetUuid) {
    const doc = await cookieBasedClient.models.Document.get(
      { documentUuid: targetUuid },
      { selectionSet: ["spaceUuid"] }
    );
    embedSpaceUuid = doc.data?.spaceUuid ?? null;
  }
  if (embedSpaceUuid && userUuid) {
    try {
      await cookieBasedClient.mutations.embedSpaceFlashcards({
        spaceUuid: embedSpaceUuid,
        userUuid,
      });
    } catch (embedError) {
      console.error("[chat-tool] Error embedding space flashcards:", embedError);
      // Don't fail the request - embedding is best-effort
    }
  }

  return NextResponse.json({
    success: true,
  });
}