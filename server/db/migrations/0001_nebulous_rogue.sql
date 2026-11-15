CREATE TABLE "bundles" (
	"bundle_uuid" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"default_sku" text,
	"additional_skus" text[],
	"modules" text[],
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curio_subscriptions" (
	"subscription_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tier" text DEFAULT 'super' NOT NULL,
	"provider_subscription_id" text,
	"provider_customer_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_summaries" (
	"document_summary_uuid" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"tags" text[],
	"key_concepts" text[],
	"markdown" text,
	"enriched_markdown" text,
	"vote" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_modules" (
	"exam_module_uuid" uuid PRIMARY KEY NOT NULL,
	"module_name" text NOT NULL,
	"question_keys" text[],
	"price" integer DEFAULT 0 NOT NULL,
	"retired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_decks" (
	"flashcard_deck_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"title" text,
	"description" text,
	"flashcards" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"metadata_uuid" uuid PRIMARY KEY NOT NULL,
	"target_uuid" text NOT NULL,
	"target_type" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_exam_logs" (
	"mock_exam_log_uuid" uuid PRIMARY KEY NOT NULL,
	"mock_exam_uuid" uuid NOT NULL,
	"question_answers" jsonb,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_exams" (
	"mock_exam_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"chat_uuid" uuid,
	"title" text NOT NULL,
	"exam_name" text,
	"mock_exam_info" jsonb,
	"questions" jsonb,
	"creation_status" text DEFAULT 'GENERATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bundle_uuid" uuid,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text,
	"receipt_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"quiz_attempt_uuid" uuid PRIMARY KEY NOT NULL,
	"quiz_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"quiz_question_uuid" uuid PRIMARY KEY NOT NULL,
	"quiz_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"source_type" text,
	"source_uuid" uuid,
	"question_content" text NOT NULL,
	"question_references" jsonb,
	"options" text[] NOT NULL,
	"hint" text,
	"answer_explanations" text[],
	"vote" text
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"quiz_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"state" text DEFAULT 'completed' NOT NULL,
	"title" text,
	"description" text,
	"difficulty" text,
	"source_type" text,
	"source_uuid" uuid,
	"question_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"receipt_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_users" (
	"space_users_uuid" uuid PRIMARY KEY NOT NULL,
	"space_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"task_uuid" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid,
	"message_uuid" uuid,
	"user_uuid" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"type" text NOT NULL,
	"args" jsonb,
	"progress" integer DEFAULT 0 NOT NULL,
	"error" text,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_action_logs" (
	"user_action_log_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"action_type" text NOT NULL,
	"source_type" text,
	"source_uuid" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"document_uuid" uuid,
	"model" text DEFAULT '' NOT NULL,
	"category" text,
	"feature" text,
	"request_status" integer DEFAULT 200 NOT NULL,
	"prompt_token_count" integer DEFAULT 0 NOT NULL,
	"candidates_token_count" integer DEFAULT 0 NOT NULL,
	"total_token_count" integer DEFAULT 0 NOT NULL,
	"latency" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curio_subscriptions" ADD CONSTRAINT "curio_subscriptions_user_id_users_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_exam_logs" ADD CONSTRAINT "mock_exam_logs_mock_exam_uuid_mock_exams_mock_exam_uuid_fk" FOREIGN KEY ("mock_exam_uuid") REFERENCES "public"."mock_exams"("mock_exam_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_uuid_quizzes_quiz_uuid_fk" FOREIGN KEY ("quiz_uuid") REFERENCES "public"."quizzes"("quiz_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_uuid_quizzes_quiz_uuid_fk" FOREIGN KEY ("quiz_uuid") REFERENCES "public"."quizzes"("quiz_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_users" ADD CONSTRAINT "space_users_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_users" ADD CONSTRAINT "space_users_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_action_logs" ADD CONSTRAINT "user_action_logs_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_requests" ADD CONSTRAINT "user_requests_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "curio_subscriptions_user_idx" ON "curio_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_summaries_doc_idx" ON "document_summaries" USING btree ("document_uuid");--> statement-breakpoint
CREATE INDEX "flashcard_decks_user_idx" ON "flashcard_decks" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "metadata_target_idx" ON "metadata" USING btree ("target_uuid","target_type");--> statement-breakpoint
CREATE INDEX "mock_exam_logs_exam_idx" ON "mock_exam_logs" USING btree ("mock_exam_uuid");--> statement-breakpoint
CREATE INDEX "mock_exams_user_idx" ON "mock_exams" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "purchases_user_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_idx" ON "quiz_attempts" USING btree ("quiz_uuid");--> statement-breakpoint
CREATE INDEX "quiz_questions_quiz_idx" ON "quiz_questions" USING btree ("quiz_uuid");--> statement-breakpoint
CREATE INDEX "quizzes_user_idx" ON "quizzes" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "space_users_space_idx" ON "space_users" USING btree ("space_uuid");--> statement-breakpoint
CREATE INDEX "space_users_user_idx" ON "space_users" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "tasks_user_idx" ON "tasks" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "user_action_logs_user_idx" ON "user_action_logs" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "user_requests_user_idx" ON "user_requests" USING btree ("user_uuid","created_at");