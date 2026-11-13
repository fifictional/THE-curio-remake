# Backend & Amplify (Gen 2) – Detailed Reference

This document describes the backend stack, Amplify Gen 2 setup, AWS services, AI models, and main flows. Use it when working in `amplify/` or backend-related code.

---

## Technologies & AWS Services

| Technology / Service | Use in this project |
|----------------------|---------------------|
| **AWS Amplify Gen 2** | Backend definition: `defineBackend`, auth, data, storage, functions. Docs: https://docs.amplify.aws/nextjs/ (Gen 2). |
| **Amazon Cognito** | Auth: email + Google OAuth, groups (`admin`, `student`), triggers (post-confirmation, post-authentication, pre-sign-up). |
| **AppSync (Amplify Data)** | GraphQL API for data; schema in `amplify/data/resource.ts`; Lambda authorizers for models. |
| **DynamoDB** | All data models; PITR enabled for some tables (e.g. Purchase, QuestionBank tables). |
| **Lambda (Node.js)** | All business logic: AI chat, document processing, payments, Neptune, batch jobs, etc. Runtime is set per function (e.g. Node 20.x in resource definitions). Note: Node 20 is deprecated; when upgrading, check [Amplify Gen 2 docs](https://docs.amplify.aws/nextjs/) for supported Lambda runtimes (e.g. Node 22). |
| **S3** | Storage buckets: `student-documents/*`, `yt-transcripts/*`, `mock-exams/*`, `exam-papers/*`, `generated-references/*`, `ai-chat-attachments/*`, `partnerships/*`, `generated-images/*`; plus prompt storage (versioned). |
| **SQS** | Document processing queue (ProcessDocument pipeline); batch processing queue. |
| **Step Functions** | Document processing state machine (convert → file-type detection → extract-and-embed → categorise → summary → flashcards → datalab steps). Uses **JSONata** (not JSONPath). |
| **Neptune** | Knowledge graph: subjects, topics, concepts, terms, exams; learning profile; VPC-only access. |
| **OpenSearch** | RAG: vector index for document embeddings; Bedrock for embeddings. |
| **Bedrock** | Embeddings (used by `document-embedding.ts`, `opensearchClient.ts`); Anthropic models via Bedrock. |
| **Secrets Manager** | API keys: `anthropic/api-key`, `gemini-api-key`, `mixpanel`, `supadata/api-key`, `youtube/api-key`, `datalab-api-key`, etc. |
| **CloudWatch** | Metrics (custom metrics from Lambdas); logging. |
| **EventBridge** | Scheduled rules (e.g. weekly QuestionBank backup). |
| **CDK (aws-cdk-lib)** | Infrastructure: `backend.ts` and custom constructs (ProcessDocument, QueuesStack, OpenSearchBedrockStack, BatchProcessingStack). |

---

## Amplify Backend Layout

```
amplify/
├── backend.ts              # defineBackend: auth, data, storage, all Lambdas, ProcessDocument, queues, batch, OpenSearch
├── data/
│   ├── resource.ts        # Schema: models, custom queries/mutations, Lambda authorizers
│   └── knowledge-base-types.ts
├── auth/
│   ├── resource.ts        # defineAuth: email, Google, groups, triggers
│   ├── post-confirmation/
│   ├── post-authentication/
│   ├── pre-signup/
│   └── verification-template.ts
├── storage/
│   └── resource.ts        # defineStorage: buckets and paths (student-documents, yt-transcripts, etc.)
├── functions/             # One folder per Lambda (resource.ts + handler.ts)
├── custom/                # CDK constructs
│   ├── ProcessDocument/  # Document pipeline (Step Functions + Lambdas)
│   ├── opensearch-bedrock/
│   ├── queues-stack/
│   └── question-bank-backup/
├── ai/                    # AI agents, providers, tools, intents (used by Lambdas)
│   ├── agents/
│   ├── providers/
│   ├── tools/
│   └── intents/
└── utils/                 # Shared Lambda utils (Neptune, OpenSearch, meta, document-embedding)
```

---

## Auth (Cognito)

- **Definition**: `amplify/auth/resource.ts`.
- **Login**: Email + Google (clientId/clientSecret from secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- **User attributes**: `familyName`, `givenName` (mutable, required).
- **Groups**: `admin`, `student`.
- **Triggers**:
  - **postConfirmation**: After sign-up confirm; add user to group.
  - **postAuthentication**: After login; sync group.
  - **preSignUp**: Before sign-up.
- **Senders**: Email from `curio@flylane.com` (SES).
- **Override**: `overrideCognitoDefaultSettings(backend.auth.resources.cfnResources)` in `backend.ts`.

---

## Data Schema (Amplify Data) – Summary

- **Location**: `amplify/data/resource.ts`. All models use `authorization((allow) => [allow.publicApiKey()])` (API key for backend Lambdas); some also allow `allow.authenticated()` or `allow.groups()`.
- **Main models**: UserProfile, UserRequest, UserActionLog, Space, SpaceUsers, Document, DocumentSummary, DocumentSection, DocumentVisionOutput, Task, Message, Chat, ChatCitation, FlashcardDeck, Flashcard, Question, Quiz, YoutubeVideo, ExamPaper, Purchase, Metadata, DatalabRequest, QuestionExtractJob, QuestionGenerationJob, ExtractedQuestion, MockDocument, and knowledge-base types (Subject, Topic, Concept, Term, Exam, etc.).
- **Task types** (enum): `LAYOUT_DETECTION`, `DOCUMENT_PROCESSING`, `QUESTION_GENERATION`, `FLASHCARD_GENERATION`, `CHAT`, `QUESTION_EXTRACT`, `EXTRACT_MODULES`, `EXTRACT_ANSWER_MODULES`, `GENERATE_QUESTIONS`.
- **Custom operations**: Many models have custom queries/mutations that invoke specific Lambdas (e.g. `listDocumentBySpaceUuidAndCreatedAt`, document CRUD with move/delete Lambdas, chat, task creation, Neptune, batch, etc.). See `resource.ts` for exact handler bindings.

---

## Storage (S3)

- **Default bucket** (`defineStorage` name: `ai-tutor-storage`):  
  `student-documents/*`, `yt-transcripts/*`, `mock-exams/*`, `exam-papers/*`, `generated-references/*`, `ai-chat-attachments/*`, `partnerships/*`, `generated-images/*`.  
  Access: authenticated, groups, guest (where applicable), and specific Lambdas per path (see `storage/resource.ts`).
- **Prompt storage** (versioned): `prompts/*`, admin-only.

---

## Lambda Functions (by category)

**AI & chat**

- **ai-chat** – Main chat Lambda; uses orchestrator + chat agents (QueryUnderstanding, GenericChat, TutorChat, ToolAcknowledgment, Flashcard, Quiz, Validation, MockExamChat, ImageGeneration). Writes Message/Task via Amplify Data; invoked by AppSync (custom mutation) or indirectly via Task creation from Next.js API.

**Document processing (Step Functions pipeline)**

- **process-task-stream** – Consumes Task table DynamoDB stream; enqueues document jobs to SQS.
- **process-document-update-task-status** – Updates Task status.
- **process-document-create-summary** – Document summary.
- **process-document-create-flashcards** – Flashcards from document.
- **process-document-categorise** – Categorisation (Neptune).
- **process-document-datalab-submit** – Submit to Datalab.
- **process-document-datalab-wait-for-token** – Wait for Datalab token (Step Functions task token).
- **process-document-datalab-retrieve** – Retrieve Datalab result (Function URL callback).
- **process-document-file-type-detection** – File type detection.
- **extract-and-embed** – Extract text and embed (OpenSearch/Bedrock).

**Document & resource actions**

- **move-document**, **delete-document**, **move-chat**, **delete-chat**, **move-all-user-resources**, **delete-user**

**Payments & subscriptions**

- **fulfill-purchase** – Paddle fulfillment.
- **transaction-completed** – Paddle transaction webhook (Function URL).
- **subscription-update** – Paddle subscription webhook (Function URL).

**SAT / question bank**

- **sat-extract-modules**, **sat-extract-answer-modules**, **sat-question-extractor**, **sat-extract-answers**
- **extract-question-references**
- **generate-questions**, **generate-question-reference**, **generate-question-answer**
- **fix-question-concepts**
- **mock-exams-generate-questions**
- **question-bank-backup** – Weekly backup (EventBridge) of QuestionBank tables to S3.

**Neptune & knowledge graph**

- **neptune-query** – Ad-hoc Neptune queries (Function URL or AppSync).
- **neptune-knowledge-base** – Knowledge base operations (terms, subjects, concepts, exams, topics).
- **neptune-learning-profile** – Learning profile.
- **neptune-create-default-nodes**
- **retrieve-datalab-query** – Datalab callback (Function URL).

**RAG & search**

- **query-rag-lambda** – RAG queries over OpenSearch.
- **extract-and-embed** – See document processing.

**Batch & admin**

- **batch-processor**: **batch-creator** (enqueue jobs), **batch-mutator** (run jobs, e.g. flashcard migration, categorise).
- **admin-search-users**

---

## Document Processing Flow (ProcessDocument)

- **Entry**: Task created with type e.g. `DOCUMENT_PROCESSING`; **process-task-stream** reads Task table stream and sends message to SQS.
- **Consumer**: Step Functions state machine (defined in `custom/ProcessDocument/`) consumes from SQS.
- **Steps** (in `nested-stacks/steps/`):  
  convert-to-pdf → file-type-detection → extract-and-embed → categorise-document → create-summary → create-flashcards → datalab-submit → datalab-wait-for-token → datalab-retrieve → update-task-status (and parallel paths as defined).
- **Lambdas** used: Convert-to-PDF (custom Lambda in ProcessDocument), then Amplify Lambdas for update-task-status, create-summary, create-flashcards, categorise, datalab-submit/retrieve/wait-for-token, extract-and-embed, file-type-detection.
- **State machine**: JSONata for variables (e.g. `$states.input.taskUuid`). Do not use JSONPath-only fields (`parameters`, `resultPath`, etc.); see `custom/ProcessDocument/.cursor/rules/step-functions.mdc` if present.

---

## AI Providers & Models

- **Provider registry**: `amplify/ai/providers/provider-resolver.ts` – singleton; each provider registers its models; `getProviderForModel(model)` returns the provider for a given model string.
- **Providers** (instantiated in `amplify/ai/providers/index.ts`):  
  **GPTProvider**, **GeminiProvider**, **GPTTranscriptionProvider**, **GPTCompletionProvider**, **GeminiImageProvider**, **AnthropicProvider**.
- **Model constants** (use these names when calling AI):
  - **OpenAI** (`amplify/ai/providers/openai-models.ts`): e.g. `gpt-5.2`, `gpt-5.1`, `gpt-5`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o1`, whisper/transcription models, etc.
  - **Anthropic** (`anthropic-models.ts`): e.g. `claude-sonnet-4-6`.
  - **Gemini** (`gemini-models.ts`): e.g. `gemini-3-pro-preview`, `gemini-3.1-flash-lite-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`, image/audio variants.
- **Anthropic via Bedrock**: Some Anthropic models are used via AWS Bedrock; API key (Secrets Manager) is still used where the provider calls Anthropic API directly.
- **Secrets**: Lambdas get API keys from Secrets Manager (e.g. `anthropic/api-key`, `gemini-api-key`); `backend.ts` grants read to the relevant functions.

---

## AI Intents & Model Selection

- **Intents** (`amplify/ai/intents/types.ts`): `chat`, `generate-questions`, `generate-references`, `generate-flashcards`, `generate-image`, `document-summary`, `document-conversion`, `document-categorization`, `extract-modules`, `extract-questions`, `extract-answers`.
- **Resolution**: `getModelsForIntent(intent, userTier)` returns ordered list of models for that intent and tier (technical, ultra, super). Each intent has a handler in `amplify/ai/intents/` (e.g. `chat`, `document-summary`).
- **Tiers**: Defined in `amplify/ai/intents/tier.ts` (e.g. `TIER`, `UserTier`).

---

## AI Agents (used by ai-chat)

- **Orchestrator**: `amplify/ai/agents/orchestrator.ts` – routes to agents by name.
- **Chat agents** (`amplify/ai/agents/chat/`): QueryUnderstandingAgent, GenericChatAgent, TutorChatAgent, ToolAcknowledgmentAgent, FlashcardAgent, QuizAgent, ValidationAgent, MockExamChatAgent, ImageGenerationAgent.
- **Other agents**: Document summary, flashcard generation, document categorisation, document file type detection (in `amplify/ai/agents/`); image generation in `amplify/ai/agents/image-generation`.
- **Base**: `BaseAgent` in `base-agent.ts`; agents use `callAI(...)` with model, category, feature, prompt, userTier; token usage can be saved via `saveTokenData`.

---

## Queues & Batch

- **QueuesStack** (`custom/queues-stack/`): SQS queue for document processing; URL passed to **process-task-stream** and **ProcessDocument**.
- **BatchProcessingStack**: Batch queue; **batch-creator** enqueues jobs, **batch-mutator** processes them (e.g. flashcard migration, categorise). Creator gets `BATCH_QUEUE_URL`; mutator gets Cognito user pool ID and branch.

---

## Neptune

- **Usage**: Knowledge graph (subjects, topics, concepts, terms, exams), learning profile, categorisation.
- **Access**: Lambdas that need Neptune are attached to VPC via `configureNeptuneAccess()` in `backend.ts` using subnet IDs from `getNeptuneSubnetIds()` (external Neptune stack).
- **Functions with Neptune**: process-document-categorise, neptune-knowledge-base, neptune-learning-profile, neptune-create-default-nodes, neptune-query, sat-question-extractor, generate-questions, fix-question-concepts, batch-mutator.

---

## OpenSearch & Bedrock (RAG)

- **OpenSearchBedrockStack** (`custom/opensearch-bedrock/resource.ts`): OpenSearch domain; Bedrock for embeddings; policies for extract-and-embed, delete-document, query-rag-lambda, ai-chat, batch-mutator, delete-user.
- **Embeddings**: `amplify/utils/document-embedding.ts` and `amplify/utils/opensearchClient.ts` use `@aws-sdk/client-bedrock-runtime` (BedrockRuntimeClient, InvokeModelCommand) for embedding.

---

## Secrets (Secrets Manager)

- **anthropic/api-key** – Anthropic (and Bedrock where used).
- **gemini-api-key** – Gemini.
- **mixpanel** – Mixpanel (ProcessDocument Lambdas).
- **supadata/api-key** – Convert-to-PDF (ProcessDocument).
- **youtube/api-key** – YouTube (ProcessDocument).
- **datalab-api-key** – Datalab submit/retrieve.
- **openai/api-key** – If used (e.g. OpenAI providers).
- **supadata/api-key** – Supadata.

Grant read in `backend.ts` to the Lambdas that need each secret.

---

## Function URLs (public webhooks)

- **subscription-update** – Paddle subscription webhook.
- **transaction-completed** – Paddle transaction webhook.
- **retrieve-datalab-query** – Datalab callback for Step Functions task token; URL passed to **process-document-datalab-submit** as `datalabCallBackUrl`.

---

## Conventions for Agents

- **Amplify Gen 2 only** – Use Gen 2 APIs and docs (Next.js: https://docs.amplify.aws/nextjs/). Do not use Gen 1 patterns.
- **Schema changes** – Add or change models and custom operations in `amplify/data/resource.ts`; run `npx ampx sandbox` (or deploy) to apply.
- **New Lambda** – Add folder under `amplify/functions/<name>` with `resource.ts` and `handler.ts`; register in `backend.ts` and in `data/resource.ts` if the Lambda is an authorizer or custom action.
- **Secrets** – Create in AWS Secrets Manager; grant read in `backend.ts` to the Lambda role.
- **Step Functions** – Use JSONata; variables via `assign`; see ProcessDocument step-functions rules if present.
- **AI model** – Add constant to the right `*-models.ts` file; register in the provider; use intents for tier-based model selection.
