import { cookieBasedClient, getUserId } from "@/lib/ssr/utils";
import { Flashcard } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const { documentUuids, count } = await request.json();

  const userUuid = await getUserId();
  if (!userUuid) {
    return NextResponse.json(
      { error: 'User ID not found in request' },
      { status: 500 }
    );
  }

  const gameUuId = uuidv4();

  console.log('Getting flashcards for documents', documentUuids);
  const allFlashcards: Flashcard[] = [];
  const allDocNames: string[] = [];
  
  // Get flashcards from FlashcardDecks linked to documents
  for (const documentUuid of documentUuids) {
    const doc = await cookieBasedClient.models.Document.get({ documentUuid });
    allDocNames.push(doc.data?.fileName ?? '');
    
    // Get the flashcard deck for this document
    const flashcardDeckUuid = doc.data?.flashcardDeckUuid;
    if (flashcardDeckUuid) {
      const deckResponse = await cookieBasedClient.models.FlashcardDeck.get({ 
        flashcardDeckUuid 
      });
      
      if (deckResponse.data?.flashcards) {
        // Add document context to each flashcard
        const flashcardsWithDoc = deckResponse.data.flashcards.map((f: any) => ({
          ...f,
          documentUuid,
        }));
        allFlashcards.push(...flashcardsWithDoc);
      }
    }
  }
  console.log('All flashcards', allFlashcards.length);

  console.log('Selecting flashcards', count);
  // select the flashcards in a random order.
  const shuffledFlashcards = allFlashcards.sort(() => Math.random() - 0.5);
  const selectedFlashcards = shuffledFlashcards.slice(0, count);

  console.log('Creating game', gameUuId);
  // create the game
  const game = await cookieBasedClient.models.FlashcardGame.create({
    flashcardGameUuid: gameUuId,
    flashcards: selectedFlashcards.map((flashcard) => ({
      flashcardUuid: flashcard.flashcardUuid,
      documentUuid: flashcard.documentUuid,
      title: flashcard.title,
      content: flashcard.content,
    })),
    progress: 0,
    score: 0,
    title: `A game of ${count} flashcards`,
    description: `flashcards from ${allDocNames.join(', ')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userUuid: userUuid,
  });
  console.log('Game created', game);

  return NextResponse.json({ gameUuId });
}