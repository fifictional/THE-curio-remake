CREATE TABLE "chat_citations" (
	"chat_citation_uuid" uuid PRIMARY KEY NOT NULL,
	"chat_uuid" uuid NOT NULL,
	"message_uuid" uuid NOT NULL,
	"user_uuid" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"start_index" integer DEFAULT 0 NOT NULL,
	"end_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_vision_outputs" (
	"document_vision_output_uuid" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"total_pages" integer,
	"page_number" integer,
	"bbox" text,
	"class_name" text,
	"confidence" double precision,
	"caption" text,
	"text" text
);
--> statement-breakpoint
CREATE TABLE "import_quarantine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_table" text NOT NULL,
	"reason" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_blocks" (
	"memory_block_uuid" uuid PRIMARY KEY NOT NULL,
	"owner_uuid" uuid NOT NULL,
	"scope" text DEFAULT 'user' NOT NULL,
	"scope_id" text NOT NULL,
	"block_type" text NOT NULL,
	"block_type_updated_at" text,
	"payload" jsonb,
	"topic" text NOT NULL,
	"subject" text,
	"document_uuid" uuid,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"attempt_scores" double precision[],
	"attempt_dates" text[],
	"sources" text[],
	"first_seen_at" timestamp with time zone,
	"last_reinforced_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"added_from" text,
	"is_backfill" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_candidates" (
	"memory_candidate_uuid" uuid PRIMARY KEY NOT NULL,
	"owner_uuid" uuid NOT NULL,
	"scope" text DEFAULT 'user' NOT NULL,
	"scope_id" text NOT NULL,
	"proposed_block" jsonb,
	"decision" text DEFAULT 'rejected' NOT NULL,
	"merged_into_uuid" uuid,
	"message_uuid" uuid,
	"chat_uuid" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curio_subscriptions" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "curio_subscriptions" ADD COLUMN "next_billing_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "user_uuid" uuid;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "last_score" integer;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "last_total" integer;--> statement-breakpoint
ALTER TABLE "space_users" ADD COLUMN "level_created_at" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_help" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_skipped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "memory_disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_citations" ADD CONSTRAINT "chat_citations_chat_uuid_chats_chat_uuid_fk" FOREIGN KEY ("chat_uuid") REFERENCES "public"."chats"("chat_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_citations" ADD CONSTRAINT "chat_citations_message_uuid_messages_message_uuid_fk" FOREIGN KEY ("message_uuid") REFERENCES "public"."messages"("message_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_citations" ADD CONSTRAINT "chat_citations_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_vision_outputs" ADD CONSTRAINT "document_vision_outputs_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_citations_chat_idx" ON "chat_citations" USING btree ("chat_uuid","created_at");--> statement-breakpoint
CREATE INDEX "document_vision_outputs_doc_idx" ON "document_vision_outputs" USING btree ("document_uuid","page_number");--> statement-breakpoint
CREATE INDEX "memory_blocks_owner_idx" ON "memory_blocks" USING btree ("owner_uuid","block_type_updated_at");--> statement-breakpoint
CREATE INDEX "memory_blocks_scope_idx" ON "memory_blocks" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "memory_candidates_owner_idx" ON "memory_candidates" USING btree ("owner_uuid","created_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "space_users_level_idx" ON "space_users" USING btree ("space_uuid","level_created_at");