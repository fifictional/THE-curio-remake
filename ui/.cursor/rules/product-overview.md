# Product Overview – Curio

This document describes **Curio** from a functional and product perspective: what the product is, who uses it, and how the main features and flows work. Use it when implementing or changing user-facing behavior.

---

## Product Identity

- **Name**: Curio  
- **Tagline**: Your Personal Learning Assistant  
- **Description**: Upload documents, analyze videos, and create personalized learning spaces with AI.  
- **Primary use cases**: Study from PDFs and videos, chat with an AI tutor, generate summaries and flashcards, take quizzes and practice tests, and track learning (including SAT-style practice).

---

## User Types & Access

| Type | Description | Access |
|------|-------------|--------|
| **Student** | Standard learner; can use documents, chat, spaces, mock exams, and paid features if subscribed. | Cognito group `student`; authenticated. |
| **Admin** | Internal operator; can access `/admin/*` (statistics, bundles, subscriptions, knowledge base, batch jobs, etc.). | Cognito group `admin`. |
| **Guest** | Limited; can upload/read in some flows (e.g. library, documents) and use chat with restrictions. | Authenticated without subscription or unauthenticated where allowed. |
| **Subscribed user** | Student with an active subscription (Super Curio, Ultra Curio, etc.). | Determined by Paddle subscription + app logic; unlocks exam bundles, SAT features, higher limits, etc. |

**Authentication**: Email + password, or Google OAuth. Login/signup via Amplify Authenticator; callback URLs include localhost and production domains (curio.to, app.curio.to, dev.curio.to).

---

## Main Entry Points & Navigation

- **Home** (`/`): Greeting, general chat input, document upload (plus optional flash sale banner). Starting a chat or uploading a document are primary actions.
- **Library** (`/library`): User’s documents and spaces; file browser with move/delete; “Your library” and space sections.
- **Sidebar** (when authenticated): Recent documents, chats, mock exams, spaces (owned + shared), links to profile, exam bundles, gifting, feedback, settings. Floating nav on mobile.
- **Profile** (`/profile`): Account info, subscription, billing period, cancel subscription, delete account, country preference.
- **Exam Bundles** (`/exam-bundles`): Purchase plans (e.g. Super Curio, Ultra Curio); Paddle checkout; discount codes and billing period (monthly/annual).
- **Mock Exams** (`/mock-exams`): List of user’s mock exams; create or open a mock exam.
- **SAT US (Satus)** (`/satus`): SAT-focused dashboard: learning profile, mastery levels, weekly progress, recent exams, practice topics, recommended chats for mistakes.

---

## Core Features (Detailed)

### 1. Home & General Chat

- **Purpose**: First screen after login; user can type a message or upload a document to start learning.
- **Behavior**:
  - **General chat**: User types a message; optionally attaches documents (as references) or starts a YouTube URL. Submitting can create a new chat and redirect to `/chats/[chatUuid]`.
  - **Document upload**: User uploads PDF/images or adds a YouTube link. Upload goes to S3 and document record is created via `/api/documents/store`; a **DOCUMENT_PROCESSING** task is created so the backend pipeline runs (summary, flashcards, etc.). UI can show “Analyzing your document...” and then navigate to the document or library.
- **Chat capabilities** (in chat context): Text messages, image attachments, YouTube URLs, document references (with RAG when document has embeddings). AI can use tools (e.g. web search, create flashcards, generate quiz). Rate limits and message caps apply (e.g. MAX_NORMAL_MESSAGES).

### 2. Documents

- **Upload**:  
  - **Where**: Home (general chat area), Library (file browser), Companion upload (`/companion/upload`), or modals (e.g. upload modal, YouTube modal).  
  - **Flow**: Files go to S3 (`student-documents/{userUuid}/{documentUuid}/...`). Client calls `POST /api/documents/store` with key, fileName, documentCount, spaceUuid. API creates Document in Amplify Data and a **Task** with type **DOCUMENT_PROCESSING**. Task triggers the Step Functions pipeline (convert-to-PDF if needed, file-type detection, extract-and-embed, categorise, summary, flashcards, etc.). User action log entry `analyzing_document` is written.
- **Library**: List of user’s documents (and optionally by space). User can click to open, move to a space, or delete. Pagination and real-time updates via Amplify subscriptions.
- **Document viewer** (`/documents/[docUuid]` or under `/spaces/[spaceId]/documents/[docUuid]`):  
  - **Content**: PDF viewer (with zoom, search, pointer/text/image tools) or YouTube viewer.  
  - **Right panel (tabs)**: Summary, Document/Video, Chat, Flashcards, Quiz. Summary can stream; user can vote up/down. Flashcards and Quiz are generated from the document (after pipeline completes).  
  - **Access**: Access control is enforced (e.g. `useHasResourceAccess`); shared spaces can allow access for other users.
- **Document processing pipeline** (backend): After upload, Task is created → DynamoDB stream → process-task-stream Lambda → SQS → Step Functions: convert-to-PDF → file-type-detection → extract-and-embed (RAG) → categorise (Neptune) → create-summary → create-flashcards → datalab steps → update-task-status. User sees loading states per tab (e.g. “Generating summary”, “Generating flashcards”) until completion.

### 3. Spaces (Folders)

- **Concept**: Spaces are folders that contain documents and chats. A space has a name and owner; it can be shared with other users (SpaceUsers with level: owner/editor/viewer).
- **Library**: Spaces listed; user can select a space to filter documents or open a space.
- **Space view** (`/spaces/[spaceId]`): Shows space-level content: library (documents in that space), flashcards, quiz. No single-document context; right panel offers space-library, flashcards, quiz.
- **Sharing**: Admin or UI can add SpaceUsers; sidebar shows which spaces are “shared” (have other members or user is not owner).

### 4. Chats

- **Standalone chat** (`/chats/[chatUuid]`): One conversation; can be “general” (no document) or linked to a document/space. Messages are stored as Message model; AI responses are produced by ai-chat Lambda (orchestrator + agents: QueryUnderstanding, GenericChat, TutorChat, ToolAcknowledgment, Flashcard, Quiz, Validation, MockExamChat, ImageGeneration). User can use web search, request flashcards or quiz from the conversation. Right panel can show sources, flashcards, quiz if generated.
- **Document/space chat**: When viewing a document or space, the Chat tab uses that context (document markdown or space documents with RAG) so the AI can answer from the user’s content.
- **Creating a chat**: From home, submitting the first message creates a chat and redirects. From document/space, chat is scoped to that document or space.

### 5. Mock Exams

- **Purpose**: Practice tests (e.g. SAT-style); user can take a full exam or practice individual questions.
- **List** (`/mock-exams`): User’s mock exams; create new or open existing.
- **Mock exam view** (`/mock-exams/[mockExamUuid]`): Tabs: Tests, Questions, Chat; and for a specific test: practice question view, take exam flow, exam chat, question list. Questions can have references (images, passages); user can chat per question (e.g. SAT question chat).
- **Creation**: Mock exams can be generated by the backend (mock-exams-generate-questions Lambda) or from admin flows. User may get a free SAT mock exam (e.g. via profile or exam-bundles).

### 6. SAT US (Satus)

- **Purpose**: SAT-focused learning: track mastery, progress, and practice.
- **Dashboard** (`/satus`): Learning profile (Neptune), weekly progress, mastery cards (math/English), recent exams, practice topics, recommended chats for recent mistakes. User can start a practice chat or create a SAT mini exam.
- **Progress** (`/satus/progress`): Progress view for SAT mini.
- **Take exam** (`/satus/take/[logUuid]`): Take a SAT mini exam.
- **Data**: Learning profile and mastery levels come from Neptune (learning-profile Lambda); exam logs and recent mistakes from app data.

### 7. Exam Bundles & Subscriptions

- **Purpose**: Monetization; users buy bundles (e.g. Super Curio, Ultra Curio) or subscribe (monthly/annual) to unlock content and limits.
- **Exam Bundles page** (`/exam-bundles`): Lists bundles with Paddle prices; discount codes and billing period (monthly/annual); flash sales can override default billing period or discount. User clicks to checkout via Paddle.
- **One-dollar offer** (`/one-dollar`): Promotional page with fixed discount code (e.g. ONEDPROMO); shows selected plans at promotional price.
- **Profile**: Shows active subscription, billing period, cancel subscription (CancelSubscriptionModal), and delete account (DeleteAccountModal).
- **Backend**: Paddle webhooks (subscription-update, transaction-completed Lambdas) update subscription and grant access; fulfill-purchase Lambda handles fulfillment. Subscription and ownership drive feature flags (e.g. isUserSubscribed) and bundle ownership (e.g. useOwnedBundlesApi).

### 8. Gifting & Partner Flows

- **Gifting** (`/gifting`): User can buy a subscription as a gift; steps: image/hero, then recipient email + message + subscription start date, then pricing (Paddle). Success page after purchase.
- **Partner** (`/partner/[partnerCode]`): Partner-specific pricing. Partnership is fetched by code; custom price overrides and display mode can be applied. Steps: hero, use cases, pricing. Success at `/partner/success` or similar.
- **Partnerships**: Stored in app data; admin can manage at `/admin/partnerships`.

### 9. Onboarding & Welcome

- **Onboarding** (`/onboarding`): Multi-step flow (e.g. Page1–Page3, PageFinal); collects lifestage and intent; can finish by going to signup or to demo document (`/onboarding/demo/[docUuid]`). Skip goes to signup.
- **Welcome** (`/welcome`): Post-signup or first-time experience: lifestage → intent → pricing; then “Complete” leads to `/welcome/end`. Onboarding data is saved to user profile; completion/skip is tracked.
- **Welcome end** (`/welcome/end`): Final step after onboarding complete/skip.

### 10. Profile & Account

- **Profile** (`/profile`): User attributes (name, email, country), country selector (saved to UserProfile), copy user ID, owned bundles, active subscription, billing period, cancel subscription, delete account. Delete account calls deleteUser mutation and signs out.
- **Session**: Session provider supplies userAttributes (e.g. userUuid, givenName, familyName) and userProfile (onboarding, country, etc.). Subscription and feature flags (e.g. isUserSubscribed, hasFeatureFlag) drive UI and limits.

### 11. Companion

- **Purpose**: Allow another device or user to “pair” and upload documents into the current user’s library.
- **Companion upload** (`/companion/upload`): Query params `userUuid`, `spaceUuid`. On load, `pairCompanion(userUuid)` is called; user can drop files to upload. Same upload API as normal (creates document + DOCUMENT_PROCESSING task). Used for e.g. mobile or shared upload into a space.

### 12. Other User-Facing Routes

- **Sign-in / Sign-up / Login**: Auth pages using Amplify Authenticator.
- **Metadata** (`/metadata/[targetId]`): Metadata for an entity (document, chat, etc.); used for link previews or external consumption.
- **SAT US exam bundle** (`/sat-us-exam-bundle`): Specific landing or bundle page for SAT US.
- **Satus onboarding**: Onboarding specific to SAT US flow.

---

## Admin Capabilities

Admin dashboard (`/admin`) links to:

- **Statistics Hub**: AI token usage, document metrics, chat metrics, latency, user requests, quiz metrics, document analytics, document types, document subjects.
- **Prompt Editor**: Manage AI prompts (stored in prompt storage bucket).
- **Bundles**: Manage product bundles (e.g. SKUs, names).
- **Bundle Ownership (Purchases)**: Grant or revoke bundle ownership for users.
- **Subscriptions**: Manage subscriptions (e.g. grant, revoke).
- **Rate Limits**: Rate limit configuration and modals.
- **App Settings**: Global app settings.
- **Mock Docs**: Manage mock documents (e.g. for mock exam content).
- **Exam Modules**: Manage exam modules (SAT structure).
- **Chats Review**: Review and moderate chats.
- **Question Extractor**: Extract questions from exam papers (upload PDF; backend runs extraction jobs).
- **Question Generator**: Generate questions from prompts (admin-only generation jobs).
- **Knowledge Base**: Manage knowledge base (subjects, topics, concepts, terms, exams).
- **User Knowledge Graph**: View user mastery levels (Neptune learning profile).
- **Partnerships**: Manage partners and partner users.
- **Batch Processing**: Trigger and monitor batch jobs (e.g. flashcard migration, categorisation).
- **Tools**: Administrative tools (e.g. Neptune query, AI playground).

---

## Key Flows (Summary)

| Flow | Trigger | Main steps |
|------|--------|------------|
| **Document upload** | User uploads file or YouTube in app or companion | S3 upload → POST /api/documents/store → create Document + Task(DOCUMENT_PROCESSING) → stream → SQS → Step Functions (convert, detect, embed, categorise, summary, flashcards, datalab) → Task status updated; UI shows loading then summary/flashcards/quiz. |
| **Chat message** | User sends message in chat UI | POST /api/ai/chat → create Message + Task(CHAT) → process-task-stream or direct invoke ai-chat Lambda → agents run → Message updated with assistant content; real-time via subscriptions. |
| **Purchase / subscription** | User checks out on Paddle | Paddle redirect or webhook → transaction-completed / subscription-update / fulfill-purchase → update Purchase and subscription state → profile and feature flags reflect access. |
| **Mock exam** | User creates or opens mock exam | Create/open MockExam; view questions, take exam, or chat per question; backend can generate questions via mock-exams-generate-questions. |
| **Space share** | Owner adds member | SpaceUsers created (spaceUuid, userUuid, level); shared user sees space in sidebar and can access documents/chats per level. |

---

## Integrations & Tracking

- **Analytics**: Mixpanel (and possibly others) for events (e.g. onboarding_started, document upload, chat started, purchase viewed, cancel_subscription). Analytics provider exposes `track()`.
- **Email**: Cognito/SES for verification and transactional email (from Curio).
- **Customer.io**: Optional; send-cio API route for CRM/email.
- **Loops**: Loop activity logs API for marketing/engagement.
- **Paddle**: Checkout, webhooks, subscription and transaction state; prices and discounts (including flash sales) drive exam-bundles and one-dollar pages.
- **Flash sales**: Stored or configured elsewhere; `useFlashSales()` and `getBannerFlashSaleForPage` / `getFlashSaleForPage` drive banners and default discount/billing on exam-bundles.

---

## Conventions for Agents

- When changing **user-facing copy or flows**, consider home, library, document viewer, chat, mock exams, satus, exam-bundles, profile, onboarding, and welcome.
- When changing **access or limits**, consider student vs admin, subscription state, and feature flags (e.g. isUserSubscribed, hasFeatureFlag).
- When changing **document or chat behavior**, consider the pipeline (Task types, Step Functions) and the ai-chat agents (see `backend.md`).
- When changing **payments or offers**, consider Paddle, webhooks, fulfill-purchase, and the exam-bundles / one-dollar / gifting / partner flows.
- **Product copy**: App metadata (title, description) is in root layout; keep product identity consistent (Curio, Personal Learning Assistant).
