ALTER TABLE "chats" ADD COLUMN "title_changed_by_the_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_web_search_called" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "has_flashcards_or_quizzes" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "flashcard_deck_uuid" uuid;