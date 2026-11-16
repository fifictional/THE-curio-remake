CREATE TABLE "app_settings" (
	"app_settings_uuid" uuid PRIMARY KEY NOT NULL,
	"feature_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maintenance_message" text,
	"memory_feature_enabled" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_processes" (
	"process_id" uuid PRIMARY KEY NOT NULL,
	"job_type" text DEFAULT '' NOT NULL,
	"job_name" text,
	"state" text,
	"failed" boolean DEFAULT false NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"completion_time" timestamp with time zone,
	"total_jobs" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"failed_jobs" integer DEFAULT 0 NOT NULL,
	"ttl" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datalab_requests" (
	"request_id" text PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"task_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"task_token" text,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_sections" (
	"document_section_uuid" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"document_type" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"section_name" text DEFAULT '' NOT NULL,
	"page_range" text DEFAULT '' NOT NULL,
	"section_summary" text DEFAULT '' NOT NULL,
	"section_key_concepts" text[] DEFAULT '{}' NOT NULL,
	"section_content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_paper_questions" (
	"exam_paper_question_uuid" uuid PRIMARY KEY NOT NULL,
	"exam_paper_uuid" uuid NOT NULL,
	"module_uuid" uuid NOT NULL,
	"question_number" text DEFAULT '' NOT NULL,
	"question_content" text DEFAULT '' NOT NULL,
	"question_options" text[] DEFAULT '{}' NOT NULL,
	"question_type" text DEFAULT '' NOT NULL,
	"question_hint" text DEFAULT '' NOT NULL,
	"question_answer_explanations" text[] DEFAULT '{}' NOT NULL,
	"question_reference" jsonb,
	"module_name" text,
	"module_number" integer,
	"question_exam_name" text,
	"question_exam_subject" text,
	"question_topic" text,
	"difficulty_level" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_papers" (
	"exam_paper_uuid" uuid PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text,
	"exam_type" text,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"document_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"paper_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_questions" (
	"extracted_question_uuid" text PRIMARY KEY NOT NULL,
	"question_extract_job_uuid" uuid,
	"question_generation_job_uuid" uuid,
	"module_number" integer DEFAULT 0 NOT NULL,
	"question_number" integer DEFAULT 0 NOT NULL,
	"module_number_question_number" text,
	"question_content" text DEFAULT '' NOT NULL,
	"question_type" text,
	"question_options" text[] DEFAULT '{}' NOT NULL,
	"correct_answer" text,
	"answer_explanations" text[],
	"hint" text,
	"question_reference" jsonb,
	"reference_extraction_status" text,
	"reference_extraction_error" text,
	"needs_reference" boolean,
	"reference_generation_prompt" text,
	"needs_code_interpreter_for_answer" boolean,
	"exam" text DEFAULT '' NOT NULL,
	"module" text DEFAULT '' NOT NULL,
	"topic" text,
	"subtopic" text,
	"concept" text,
	"difficulty" text,
	"exam_module_uuid" uuid,
	"verified" boolean,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"is_generated" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_games" (
	"flashcard_game_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"space_uuid" uuid,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"flashcards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "future_users" (
	"future_user_uuid" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"partnership_uuid" uuid,
	"sub_start_date" timestamp with time zone,
	"sub_end_date" timestamp with time zone,
	"receipt_payload" jsonb,
	"provider" text,
	"tier" text,
	"subscription_granted" boolean,
	"subscription_granted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_documents" (
	"mock_document_uuid" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"thumbnail_key" text DEFAULT '' NOT NULL,
	"content_key" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"youtube" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnerships" (
	"partnership_uuid" uuid PRIMARY KEY NOT NULL,
	"partner_name" text DEFAULT '' NOT NULL,
	"partner_code" text DEFAULT '' NOT NULL,
	"logo_s3_key" text,
	"price_record_overrides" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_extract_jobs" (
	"question_extract_job_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"s3_key" text DEFAULT '' NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"file_type" text DEFAULT '' NOT NULL,
	"status" text,
	"total_questions" integer,
	"error" text,
	"extraction_logs" text,
	"identified_modules" text,
	"answer_key_s3_key" text,
	"answer_key_file_name" text,
	"answer_key_status" text,
	"answer_key_error" text,
	"identified_answer_modules" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_generation_jobs" (
	"question_generation_job_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"status" text,
	"total_questions" integer,
	"error" text,
	"generation_logs" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sat_mini_exam_logs" (
	"sat_mini_exam_log_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"status" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_correct" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"predicted_sat_score" integer DEFAULT 0 NOT NULL,
	"reading_writing_score" integer,
	"math_score" integer,
	"concept_performance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_learning_profile_history" (
	"user_learning_profile_history_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"concept" text DEFAULT '' NOT NULL,
	"change" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "datalab_requests" ADD CONSTRAINT "datalab_requests_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datalab_requests" ADD CONSTRAINT "datalab_requests_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_sections" ADD CONSTRAINT "document_sections_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_paper_questions" ADD CONSTRAINT "exam_paper_questions_exam_paper_uuid_exam_papers_exam_paper_uuid_fk" FOREIGN KEY ("exam_paper_uuid") REFERENCES "public"."exam_papers"("exam_paper_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_questions" ADD CONSTRAINT "extracted_questions_question_extract_job_uuid_question_extract_jobs_question_extract_job_uuid_fk" FOREIGN KEY ("question_extract_job_uuid") REFERENCES "public"."question_extract_jobs"("question_extract_job_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_questions" ADD CONSTRAINT "extracted_questions_question_generation_job_uuid_question_generation_jobs_question_generation_job_uuid_fk" FOREIGN KEY ("question_generation_job_uuid") REFERENCES "public"."question_generation_jobs"("question_generation_job_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_games" ADD CONSTRAINT "flashcard_games_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_games" ADD CONSTRAINT "flashcard_games_space_uuid_spaces_space_uuid_fk" FOREIGN KEY ("space_uuid") REFERENCES "public"."spaces"("space_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "future_users" ADD CONSTRAINT "future_users_partnership_uuid_partnerships_partnership_uuid_fk" FOREIGN KEY ("partnership_uuid") REFERENCES "public"."partnerships"("partnership_uuid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_documents" ADD CONSTRAINT "mock_documents_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_extract_jobs" ADD CONSTRAINT "question_extract_jobs_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_generation_jobs" ADD CONSTRAINT "question_generation_jobs_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sat_mini_exam_logs" ADD CONSTRAINT "sat_mini_exam_logs_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_profile_history" ADD CONSTRAINT "user_learning_profile_history_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_processes_state_idx" ON "batch_processes" USING btree ("state","start_time");--> statement-breakpoint
CREATE INDEX "datalab_requests_doc_idx" ON "datalab_requests" USING btree ("document_uuid","created_at");--> statement-breakpoint
CREATE INDEX "datalab_requests_user_idx" ON "datalab_requests" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "document_sections_doc_idx" ON "document_sections" USING btree ("document_uuid");--> statement-breakpoint
CREATE INDEX "exam_paper_questions_paper_idx" ON "exam_paper_questions" USING btree ("exam_paper_uuid");--> statement-breakpoint
CREATE INDEX "exam_papers_user_idx" ON "exam_papers" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "exam_papers_doc_idx" ON "exam_papers" USING btree ("document_uuid","created_at");--> statement-breakpoint
CREATE INDEX "exam_papers_space_idx" ON "exam_papers" USING btree ("space_uuid","created_at");--> statement-breakpoint
CREATE INDEX "extracted_questions_extract_job_idx" ON "extracted_questions" USING btree ("question_extract_job_uuid","module_number_question_number");--> statement-breakpoint
CREATE INDEX "extracted_questions_generation_job_idx" ON "extracted_questions" USING btree ("question_generation_job_uuid","created_at");--> statement-breakpoint
CREATE INDEX "extracted_questions_exam_module_idx" ON "extracted_questions" USING btree ("exam_module_uuid","created_at");--> statement-breakpoint
CREATE INDEX "flashcard_games_user_idx" ON "flashcard_games" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "flashcard_games_space_idx" ON "flashcard_games" USING btree ("space_uuid","created_at");--> statement-breakpoint
CREATE INDEX "future_users_partnership_idx" ON "future_users" USING btree ("partnership_uuid","created_at");--> statement-breakpoint
CREATE INDEX "mock_documents_doc_idx" ON "mock_documents" USING btree ("document_uuid");--> statement-breakpoint
CREATE INDEX "partnerships_code_idx" ON "partnerships" USING btree ("partner_code");--> statement-breakpoint
CREATE INDEX "question_extract_jobs_user_idx" ON "question_extract_jobs" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "question_generation_jobs_user_idx" ON "question_generation_jobs" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "sat_mini_exam_logs_user_started_idx" ON "sat_mini_exam_logs" USING btree ("user_uuid","started_at");--> statement-breakpoint
CREATE INDEX "sat_mini_exam_logs_user_completed_idx" ON "sat_mini_exam_logs" USING btree ("user_uuid","completed_at");--> statement-breakpoint
CREATE INDEX "user_learning_profile_history_user_idx" ON "user_learning_profile_history" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "user_learning_profile_history_concept_idx" ON "user_learning_profile_history" USING btree ("concept","created_at");