export type Flashcard = {
  flashcardUuid: string;
  userUuid: string;
  spaceUuid?: string | null;
  documentUuid?: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  vote?: 'up' | 'down' | null;
};

// New deck-based types
export type FlashcardReference = {
  reference_type: string;
  reference_name: string;
  reference_content: string;
  reference_url: string;
};

export type FlashcardItem = {
  flashcardUuid: string;
  title: string;
  content: string;
  references?: FlashcardReference[];
  vote?: 'up' | 'down' | null;
  createdAt: string;
  updatedAt: string;
};

export type FlashcardDeck = {
  flashcardDeckUuid: string;
  userUuid: string;
  title?: string | null;
  description?: string | null;
  flashcards: FlashcardItem[];
  createdAt: string;
  updatedAt: string;
};