CREATE TABLE "youtube_videos" (
	"youtube_video_uuid" uuid PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"title" text,
	"transcript_key" text,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "youtube_video_uuid" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "flashcard_deck_uuid" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "document_count" integer;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "references" jsonb;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "vote" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "question_references" jsonb;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "hint" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "answer_explanations" text[];--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "vote" text;