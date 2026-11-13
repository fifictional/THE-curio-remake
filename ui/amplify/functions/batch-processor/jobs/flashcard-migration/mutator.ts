import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as mutatorEnv } from '$amplify/env/batch-mutator';
import { Amplify } from 'aws-amplify';
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { v4 as uuidv4 } from 'uuid';
import { JOB_NAME, MigrationJob } from "./interface";

// Initialize Amplify Data client for mutator
const { resourceConfig: mutatorResourceConfig, libraryOptions: mutatorLibraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);

Amplify.configure(mutatorResourceConfig, mutatorLibraryOptions);
const mutatorClient = generateClient<Schema>();

type MigrationFlashcard = Schema['Flashcard']['type'];

const processDocument = async (documentUuid: string, log: (message: string) => void): Promise<void> => {
  log(`Processing document: ${documentUuid}`);

  // Get the document to check for existing deck and get userUuid
  const documentResponse = await mutatorClient.models.Document.get({ documentUuid });
  if (!documentResponse.data) {
    throw new Error(`Document not found: ${documentUuid}`);
  }

  const existingDeckUuid = documentResponse.data.flashcardDeckUuid;
  const userUuid = documentResponse.data.userUuid;

  // Query all flashcards for this document using the index
  let allFlashcards: MigrationFlashcard[] = [];
  let nextToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const flashcardsResponse = await mutatorClient.models.Flashcard.listFlashcardByDocumentUuidAndCreatedAt({
      documentUuid,
    }, {
      limit: 1000,
      nextToken,
    });

    allFlashcards = [...allFlashcards, ...flashcardsResponse.data];
    nextToken = flashcardsResponse.nextToken ?? undefined;
    hasMore = !!nextToken;

    if (flashcardsResponse.data.length === 0) {
      continue;
    }
  }

  log(`Found ${allFlashcards.length} flashcards for document ${documentUuid}`);

  if (allFlashcards.length === 0) {
    log(`No flashcards found for document, skipping: ${documentUuid}`);
    return;
  }

  if (existingDeckUuid) {
    // Deck exists - fetch it and merge flashcards
    log(`Document already has flashcard deck, merging flashcards: ${documentUuid}, deck: ${existingDeckUuid}`);
    
    const deckResponse = await mutatorClient.models.FlashcardDeck.get({ flashcardDeckUuid: existingDeckUuid });
    if (!deckResponse.data) {
      throw new Error(`Deck not found: ${existingDeckUuid}`);
    }

    const existingFlashcards = (deckResponse.data.flashcards || []).filter((f) => f != null);
    const existingFlashcardUuids = new Set(existingFlashcards.map((f) => f!.flashcardUuid));

    // Add only flashcards that don't already exist in the deck
    const newFlashcardItems = allFlashcards
      .filter(f => !existingFlashcardUuids.has(f.flashcardUuid))
      .map(f => ({
        flashcardUuid: f.flashcardUuid,
        title: f.title,
        content: f.content,
        references: f.references || [],
        vote: f.vote,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }));

    if (newFlashcardItems.length === 0) {
      log(`All flashcards already in deck, skipping: ${documentUuid}`);
      return;
    }

    // Merge existing and new flashcards
    const mergedFlashcards = [...existingFlashcards, ...newFlashcardItems];

    log(`Merging ${newFlashcardItems.length} new flashcards into existing deck for document ${documentUuid}`);

    const updateResponse = await mutatorClient.models.FlashcardDeck.update({
      flashcardDeckUuid: existingDeckUuid,
      flashcards: mergedFlashcards,
      updatedAt: new Date().toISOString(),
    });

    if (updateResponse.errors) {
      throw new Error(`Failed to update deck: ${JSON.stringify(updateResponse.errors)}`);
    }

    log(`Updated deck with merged flashcards: ${documentUuid}, deck: ${existingDeckUuid}, added: ${newFlashcardItems.length}`);
  } else {
    // No existing deck - create new one
    const deckUuid = uuidv4();
    const now = new Date().toISOString();

    // Convert flashcards to FlashcardItem format
    const flashcardItems = allFlashcards.map(f => ({
      flashcardUuid: f.flashcardUuid,
      title: f.title,
      content: f.content,
      references: f.references || [],
      vote: f.vote,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    log(`Creating deck for document ${documentUuid} with ${flashcardItems.length} flashcards`);

    const createResponse = await mutatorClient.models.FlashcardDeck.create({
      flashcardDeckUuid: deckUuid,
      userUuid,
      flashcards: flashcardItems,
      createdAt: now,
      updatedAt: now,
    });

    if (createResponse.errors) {
      throw new Error(`Failed to create deck: ${JSON.stringify(createResponse.errors)}`);
    }

    // Update document to reference the deck
    const updateDocResponse = await mutatorClient.models.Document.update({
      documentUuid,
      flashcardDeckUuid: deckUuid,
    });

    if (updateDocResponse.errors) {
      throw new Error(`Failed to update document: ${JSON.stringify(updateDocResponse.errors)}`);
    }

    log(`Created deck and updated document: ${documentUuid}, deck: ${deckUuid}`);
  }
};

const processChat = async (chatUuid: string, log: (message: string) => void): Promise<void> => {
  log(`Processing chat: ${chatUuid}`);

  // Get the chat to check for existing deck and get userUuid
  const chatResponse = await mutatorClient.models.Chat.get({ chatUuid });
  if (!chatResponse.data) {
    throw new Error(`Chat not found: ${chatUuid}`);
  }

  const existingDeckUuid = chatResponse.data.flashcardDeckUuid;
  const userUuid = chatResponse.data.userUuid;

  // Query all flashcards for this chat using the index
  let allFlashcards: MigrationFlashcard[] = [];
  let nextToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const flashcardsResponse = await mutatorClient.models.Flashcard.listFlashcardByChatUuidAndCreatedAt({
      chatUuid,
    }, {
      limit: 1000,
      nextToken,
    });

    allFlashcards = [...allFlashcards, ...flashcardsResponse.data];
    nextToken = flashcardsResponse.nextToken ?? undefined;
    hasMore = !!nextToken;

    if (flashcardsResponse.data.length === 0) {
      continue;
    }
  }

  log(`Found ${allFlashcards.length} flashcards for chat ${chatUuid}`);

  if (allFlashcards.length === 0) {
    log(`No flashcards found for chat, skipping: ${chatUuid}`);
    return;
  }

  if (existingDeckUuid) {
    // Deck exists - fetch it and merge flashcards
    log(`Chat already has flashcard deck, merging flashcards: ${chatUuid}, deck: ${existingDeckUuid}`);
    
    const deckResponse = await mutatorClient.models.FlashcardDeck.get({ flashcardDeckUuid: existingDeckUuid });
    if (!deckResponse.data) {
      throw new Error(`Deck not found: ${existingDeckUuid}`);
    }

    const existingFlashcards = (deckResponse.data.flashcards || []).filter((f) => f != null);
    const existingFlashcardUuids = new Set(existingFlashcards.map((f) => f!.flashcardUuid));

    // Add only flashcards that don't already exist in the deck
    const newFlashcardItems = allFlashcards
      .filter(f => !existingFlashcardUuids.has(f.flashcardUuid))
      .map(f => ({
        flashcardUuid: f.flashcardUuid,
        title: f.title,
        content: f.content,
        references: f.references || [],
        vote: f.vote,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }));

    if (newFlashcardItems.length === 0) {
      log(`All flashcards already in deck, skipping: ${chatUuid}`);
      return;
    }

    // Merge existing and new flashcards
    const mergedFlashcards = [...existingFlashcards, ...newFlashcardItems];

    log(`Merging ${newFlashcardItems.length} new flashcards into existing deck for chat ${chatUuid}`);

    const updateResponse = await mutatorClient.models.FlashcardDeck.update({
      flashcardDeckUuid: existingDeckUuid,
      flashcards: mergedFlashcards,
      updatedAt: new Date().toISOString(),
    });

    if (updateResponse.errors) {
      throw new Error(`Failed to update deck: ${JSON.stringify(updateResponse.errors)}`);
    }

    log(`Updated deck with merged flashcards: ${chatUuid}, deck: ${existingDeckUuid}, added: ${newFlashcardItems.length}`);
  } else {
    // No existing deck - create new one
    const deckUuid = uuidv4();
    const now = new Date().toISOString();

    // Convert flashcards to FlashcardItem format
    const flashcardItems = allFlashcards.map(f => ({
      flashcardUuid: f.flashcardUuid,
      title: f.title,
      content: f.content,
      references: f.references || [],
      vote: f.vote,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    log(`Creating deck for chat ${chatUuid} with ${flashcardItems.length} flashcards`);

    const createResponse = await mutatorClient.models.FlashcardDeck.create({
      flashcardDeckUuid: deckUuid,
      userUuid,
      flashcards: flashcardItems,
      createdAt: now,
      updatedAt: now,
    });

    if (createResponse.errors) {
      throw new Error(`Failed to create deck: ${JSON.stringify(createResponse.errors)}`);
    }

    // Update chat to reference the deck
    const updateChatResponse = await mutatorClient.models.Chat.update({
      chatUuid,
      flashcardDeckUuid: deckUuid,
    });

    if (updateChatResponse.errors) {
      throw new Error(`Failed to update chat: ${JSON.stringify(updateChatResponse.errors)}`);
    }

    log(`Created deck and updated chat: ${chatUuid}, deck: ${deckUuid}`);
  }
};

// Register mutator
registerMutator({
  jobType: JOB_NAME,
  processJob: async (job: MigrationJob, log, jobId: string) => {
    const { type, uuid } = job;
    
    log(`Processing ${type} migration: ${uuid}`);

    if (type === 'document') {
      await processDocument(uuid, log);
    } else if (type === 'chat') {
      await processChat(uuid, log);
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }
  },
});

