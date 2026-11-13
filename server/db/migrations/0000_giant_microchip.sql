CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'tool');--> statement-breakpoint
CREATE TABLE "chats" (
	"chat_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"document_uuid" uuid,
	"name" text,
	"hide_in_recent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"document_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"key" text NOT NULL,
	"original_key" text,
	"file_name" text NOT NULL,
	"type" text NOT NULL,
	"has_rag_embeddings" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"flashcard_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"chat_uuid" uuid,
	"document_uuid" uuid,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"message_uuid" uuid PRIMARY KEY NOT NULL,
	"chat_uuid" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"is_completed" boolean DEFAULT true NOT NULL,
	"agent_status" text,
	"tool_name" text,
	"tool_arguments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"question_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"chat_uuid" uuid,
	"document_uuid" uuid,
	"question_content" text NOT NULL,
	"options" text[] NOT NULL,
	"answer" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"space_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_uuid" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_chat_uuid_chats_chat_uuid_fk" FOREIGN KEY ("chat_uuid") REFERENCES "public"."chats"("chat_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_uuid_chats_chat_uuid_fk" FOREIGN KEY ("chat_uuid") REFERENCES "public"."chats"("chat_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chat_uuid_chats_chat_uuid_fk" FOREIGN KEY ("chat_uuid") REFERENCES "public"."chats"("chat_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_user_idx" ON "chats" USING btree ("user_uuid","updated_at");--> statement-breakpoint
CREATE INDEX "chats_document_idx" ON "chats" USING btree ("document_uuid");--> statement-breakpoint
CREATE INDEX "chats_space_idx" ON "chats" USING btree ("space_uuid");--> statement-breakpoint
CREATE INDEX "documents_user_idx" ON "documents" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "documents_space_idx" ON "documents" USING btree ("space_uuid");--> statement-breakpoint
CREATE INDEX "flashcards_chat_idx" ON "flashcards" USING btree ("chat_uuid","created_at");--> statement-breakpoint
CREATE INDEX "flashcards_user_idx" ON "flashcards" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "messages_chat_idx" ON "messages" USING btree ("chat_uuid","created_at");--> statement-breakpoint
CREATE INDEX "questions_chat_idx" ON "questions" USING btree ("chat_uuid","created_at");--> statement-breakpoint
CREATE INDEX "questions_user_idx" ON "questions" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "spaces_user_idx" ON "spaces" USING btree ("user_uuid","updated_at");