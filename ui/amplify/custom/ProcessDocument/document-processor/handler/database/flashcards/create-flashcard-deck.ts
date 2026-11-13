import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor/create-flashcard-deck",
});

const createDeckMutation = `
  mutation CreateFlashcardDeck($input: CreateFlashcardDeckInput!) {
    createFlashcardDeck(input: $input) {
      flashcardDeckUuid
      userUuid
      title
      description
      flashcards {
        flashcardUuid
        title
        content
        references {
          reference_type
          reference_name
          reference_content
          reference_url
        }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

const updateDocumentMutation = `
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      documentUuid
      flashcardDeckUuid
    }
  }
`;

type FlashcardReference = {
  reference_type: string;
  reference_name: string;
  reference_content: string;
  reference_url: string;
};

type FlashcardItem = {
  flashcardUuid: string;
  title: string;
  content: string;
  references?: FlashcardReference[];
  createdAt: string;
  updatedAt: string;
};

type CreateFlashcardDeckInput = {
  userUuid: string;
  documentUuid: string;
  flashcards: Array<{
    title: string;
    content: string;
    references?: FlashcardReference[];
  }>;
};

export const createFlashcardDeck = async ({ 
  userUuid, 
  documentUuid, 
  flashcards 
}: CreateFlashcardDeckInput) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const now = new Date().toISOString();
  const deckUuid = uuidv4();

  // Convert flashcards to FlashcardItem format with UUIDs
  const flashcardItems: FlashcardItem[] = flashcards.map(flashcard => ({
    flashcardUuid: uuidv4(),
    title: flashcard.title,
    content: flashcard.content,
    references: flashcard.references || [],
    createdAt: now,
    updatedAt: now,
  }));

  logger.info('Creating flashcard deck', { 
    deckUuid, 
    documentUuid, 
    flashcardCount: flashcardItems.length 
  });

  // Create the flashcard deck
  const createDeckResponse = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: createDeckMutation,
      variables: {
        input: {
          flashcardDeckUuid: deckUuid,
          userUuid: userUuid,
          flashcards: flashcardItems,
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  });

  if (!createDeckResponse.ok) {
    const errorText = await createDeckResponse.text();
    logger.error('Failed to create flashcard deck', { errorText });
    throw new Error('Failed to create flashcard deck');
  }

  const createDeckResult = await createDeckResponse.json() as any;
  if (createDeckResult.errors) {
    logger.error('GraphQL errors creating flashcard deck', { errors: createDeckResult.errors });
    throw new Error('Failed to create flashcard deck');
  }

  logger.info('Successfully created flashcard deck', { deckUuid });

  // Update the document to reference this deck
  const updateDocResponse = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: updateDocumentMutation,
      variables: {
        input: {
          documentUuid: documentUuid,
          flashcardDeckUuid: deckUuid,
        },
      },
    }),
  });

  if (!updateDocResponse.ok) {
    const errorText = await updateDocResponse.text();
    logger.error('Failed to update document with deck reference', { errorText });
    throw new Error('Failed to update document with deck reference');
  }

  const updateDocResult = await updateDocResponse.json() as any;
  if (updateDocResult.errors) {
    logger.error('GraphQL errors updating document', { errors: updateDocResult.errors });
    throw new Error('Failed to update document with deck reference');
  }

  logger.info('Successfully linked flashcard deck to document', { documentUuid, deckUuid });

  return deckUuid;
};

