CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_uuid" uuid NOT NULL,
	"user_uuid" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"document_name" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_uuid_documents_document_uuid_fk" FOREIGN KEY ("document_uuid") REFERENCES "public"."documents"("document_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_user_idx" ON "document_chunks" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "document_chunks_doc_idx" ON "document_chunks" USING btree ("document_uuid","chunk_index");--> statement-breakpoint
CREATE INDEX "document_chunks_fts_idx" ON "document_chunks" USING gin (to_tsvector('english', "text"));