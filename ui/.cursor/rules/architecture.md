# Project Architecture (Detailed)

This document helps agents understand the codebase layout, data flow, naming patterns, and exactly where to make changes for common tasks.

---

## High-Level Flow

```
App Router (src/app/*)
  → Page components (usually 'use client')
  → Feature components (src/components/*)
  → Shared UI / design-system (src/design-system, src/components/ui)
  → Data: hooks (src/hooks/api/*) + providers (src/providers)
  → Backend: Next.js API routes (src/app/api/*) and Amplify (amplify/)
```

**Core rules:**

- UI components must be reusable; no business logic inside presentational components.
- Data fetching lives in hooks under `src/hooks/api/*`; pages and feature components only consume hooks and pass data as props.
- API access is either: (1) Amplify Data client in the browser, or (2) `fetch()` to `src/app/api/*` routes, or (3) server-side via `cookieBasedClient` in API routes.
- Keep `page.tsx` files thin: compose hooks + components; avoid complex logic in pages.

---

## Directory Structure (Detailed)

### `src/` (frontend)

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home
│   ├── layout.tsx                # Root layout (fonts, Providers, FixedWrapper)
│   ├── globals.css
│   ├── admin/                    # Admin pages (statistics, rate-limits, purchases, tools, etc.)
│   ├── api/                      # API route handlers (see "API routes" below)
│   ├── chats/                    # Chat list & [chatUuid] detail
│   ├── companion/                # Companion / upload
│   ├── documents/                # Document list & [docUuid] viewer
│   ├── exam-bundles/             # Exam bundle pages
│   ├── gifting/                  # Gifting flow + success
│   ├── library/                  # Library page
│   ├── login/, signin/, signup/  # Auth pages
│   ├── metadata/                 # [targetId] metadata
│   ├── mock-exams/               # Mock exams list & [mockExamUuid]
│   ├── onboarding/               # Onboarding + demo
│   ├── one-dollar/               # One-dollar offer + success
│   ├── partner/                  # Partner [partnerCode], success
│   ├── profile/                  # User profile
│   ├── sat-us-exam-bundle/       # SAT US exam bundle
│   ├── satus/                    # SAT US: progress, take
│   ├── satus-onboarding/
│   ├── spaces/                   # [spaceId] space page
│   ├── welcome/                  # Welcome + end
│   └── fonts/                    # Local fonts (e.g. Roca)
│
├── components/
│   ├── ui/                       # Shared primitives (button, card, input, select, tabs, etc.)
│   │   ├── action-menu/          # Action menu components
│   │   └── file-browser/         # File browser
│   ├── core/                     # Core features: chat, document viewer, as-tabs (quiz/summary/chat)
│   ├── layout/                   # Layout: fixed-wrapper, guest, no-permission, sidebar
│   ├── navigation/               # Nav / navigation
│   ├── modals/                   # Modal components
│   ├── admin/                    # Admin-only UI (e.g. subscriptions)
│   ├── home/                     # Home page components
│   ├── mock-exams/               # Mock exam flow components (flow/, etc.)
│   ├── onboarding/               # Onboarding flow + modal pages
│   ├── upload/                   # Upload UI
│   ├── design-system/           # Curio design system (curio-*)
│   ├── flash-sales, gifting, partner, exam-bundles, satus, satus-onboarding, custom-icons
│   └── ...
│
├── design-system/                # Curio design system (standalone)
│   ├── curio-*.tsx               # curio-button, curio-dropdown, curio-table, curio-panel, etc.
│   └── stories/                 # Design system Storybook stories
│
├── hooks/
│   ├── api/                      # Data-fetching hooks (by domain)
│   │   ├── documents/            # use-document.api, use-documents-by-user, use-upload-document, etc.
│   │   ├── chats/                # use-messages-by-chat, chat mutations
│   │   ├── mock-exams/           # Mock exam CRUD + start
│   │   ├── quizzes/              # Quizzes by source, generate quiz
│   │   ├── flashcards/          # Flashcards, chat add flashcard
│   │   ├── spaces/               # Spaces
│   │   ├── subscriptions/       # Subscriptions, subscribed user IDs
│   │   ├── payments/            # Payments-related
│   │   ├── user/                 # User data
│   │   ├── batch-processing/    # Batch jobs
│   │   ├── knowledge-base/      # Knowledge base
│   │   ├── learning-profile/    # Learning profile
│   │   ├── metadata/            # Metadata
│   │   ├── ...                  # (batch-processing, bundles, exam-modules, partnerships, etc.)
│   │   ├── use-item.api.ts      # Generic single-item fetcher (used by use-document, etc.)
│   │   ├── use-paginated-query.api.ts
│   │   ├── use-subscription.ts  # Real-time subscription helper
│   │   └── types.ts             # ByUserApiOptions, SubscriptionType
│   └── (other)                   # use-checkout, use-paddle-*, use-has-resource-access, etc.
│
├── lib/
│   ├── ssr/                      # Server-side helpers
│   │   └── utils/request-helper.ts  # cookieBasedClient, getUserId
│   ├── payments/                 # Paddle, fulfillment (server + providers)
│   ├── types/                    # Shared TS types (e.g. StudentDocument, Message)
│   ├── utils/                    # General utilities
│   ├── data/                     # Default concepts, subjects, etc.
│   ├── pdf/                      # PDF utilities
│   ├── analytics/                # Analytics helpers
│   └── sat-mini/                 # SAT mini specific
│
├── providers/
│   ├── providers.tsx             # Root provider tree (Theme, Analytics, QueryClient, Authenticator, Amplify, Session, Common, Space, Core, Chat, Tooltip)
│   ├── amplify-provider.tsx      # Amplify client (useAmplifyApiClient, useAmplifyUserApiClient)
│   ├── session-provider.tsx      # Session / user attributes
│   ├── space-provider.tsx        # Current space context
│   ├── core-provider.tsx         # Core app state (e.g. document, chat)
│   ├── chat-provider.tsx        # Chat state
│   ├── common-provider.tsx      # UI state (sidebar, right panel)
│   ├── analytics-provider.tsx   # Analytics (track)
│   └── index.ts                  # Re-exports
│
└── stories/                      # Storybook stories (e.g. Page.stories)
```

### `src/app/api/` (API route segments)

```
api/
├── admin/          # Admin-only routes (neptune-query, ai-playground, etc.)
├── ai/             # AI chat (POST /api/ai/chat, etc.)
├── documents/      # Document store (e.g. /api/documents/store)
├── flashcards/     # e.g. /api/flashcards/chat-tool
├── games/
├── link-preview/
├── loop-activity-logs/
├── mock-exam/      # Mock exam API
├── mock-exams/     # Mock exams CRUD
├── paddle/         # Paddle: prices, discounts, webhooks, etc.
├── payments/
├── quizzes/        # create, delete
├── send-cio/       # Customer.io
└── yt/             # YouTube: store, fetch
```

### `amplify/` (backend – Amplify Gen 2)

```
amplify/
├── backend.ts                    # defineBackend: auth, data, storage, all Lambda resources
├── data/
│   ├── resource.ts               # Data schema (models, custom queries/mutations → Lambda)
│   └── knowledge-base-types.ts   # Types for knowledge base models
├── auth/
│   ├── resource.ts               # Cognito user pool config
│   ├── post-authentication/      # Trigger after login
│   ├── post-confirmation/       # Trigger after signup confirm
│   ├── pre-signup/               # Trigger before signup
│   └── utils/
├── storage/                      # S3 buckets (resource.ts)
├── functions/                    # Lambda handlers (one folder per function)
│   ├── ai-chat/                  # AI chat Lambda
│   ├── process-task-stream/     # Task stream processor
│   ├── process-document-*/       # Document pipeline steps (create-summary, create-flashcards, categorise, etc.)
│   ├── move-document, delete-document, move-chat, delete-chat
│   ├── fulfill-purchase/        # Paddle fulfillment
│   ├── transaction-completed/
│   ├── subscription-update/
│   ├── neptune-query/            # Neptune graph queries
│   ├── neptune-knowledge-base/   # Knowledge base Lambdas (terms, subjects, concepts, exams, topics)
│   ├── neptune-learning-profile/
│   ├── neptune-create-default-nodes/
│   ├── generate-questions/, generate-question-answer/, generate-question-reference/
│   ├── sat-extract-modules/, sat-extract-answers/, sat-question-extractor/
│   ├── batch-processor/          # batch-creator, batch-mutator, jobs (e.g. flashcard-migration)
│   ├── query-rag-lambda/, extract-and-embed/
│   └── ... (admin-search-users, delete-user, question-bank-backup, etc.)
│   ├── common/                   # Shared Lambda code
│   └── (each function has resource.ts + handler.ts)
├── custom/                       # Custom CDK constructs
│   ├── ProcessDocument/         # Document processing pipeline (steps, nested stacks)
│   ├── opensearch-bedrock/
│   ├── queues-stack/
│   ├── question-bank-backup/
│   └── ...
├── utils/                        # Shared utilities for Lambdas
│   ├── neptune/                  # Neptune client, queries
│   ├── meta/                     # Meta helpers
│   ├── process-document/
│   └── opensearchClient.ts
└── ai/                           # AI agents, providers, tools (used by Lambdas)
    ├── agents/                   # chat (flashcard, mock-exam, image-generation, validation), document-file-type-detection
    ├── providers/                # OpenAI, Gemini, Anthropic (Bedrock), model configs
    ├── tools/                    # Tools used by agents (create-questions, web-search, etc.)
    └── intents/                  # Document categorization, conversion, tier, etc.
```

---

## Data Flow (Detailed)

### 1. Amplify Data – client-side (browser)

- **Schema**: `amplify/data/resource.ts` defines all models and custom operations. Each model can have Lambda authorizers (e.g. `Document`, `Chat`, `Task`, `Message`).
- **Config**: `amplify_outputs.json` at project root; app configures Amplify in `src/providers/amplify-provider.tsx` with `Amplify.configure(awsExports)`.
- **Clients** (in `amplify-provider.tsx`):
  - `client` = `generateClient<Schema>({ authMode: "apiKey" })` – used for most app operations (authorization is enforced by schema/Lambda).
  - `userClient` = `generateClient<Schema>({ authMode: "userPool" })` – when you need the signed-in user’s identity explicitly.
- **Access in UI**: `useAmplifyApiClient()` returns `client`. Use it inside components/hooks that run in the browser (inside `AmplifyProvider`).
- **Typical usage in hooks**:
  - **Single item**: `client.models.Document.get({ documentUuid })` with a `selectionSet`.
  - **List**: `client.models.Document.list({ filter: { userUuid: { eq: userId } }, ... })`.
  - **Create/Update/Delete**: `client.models.*.create/update/delete(...)`.
  - **Subscriptions**: `client.models.Document.onCreate/onUpdate/onDelete({ filter, selectionSet }).subscribe({ next: ... })`.
- **Pattern**: Hooks in `src/hooks/api/*` call `useAmplifyApiClient()`, then use `client.models.<Model>.*`. Many list hooks also use `usePaginatedQuery` or custom pagination and combine with `useSubscription` for real-time updates. Single-entity hooks often use `useItemApi` (see below) which wraps a `getItemFunc` that calls `client.models.*.get`.

**Example – single document:**  
`src/hooks/api/documents/use-document.api.ts`: uses `useAmplifyApiClient()`, `useItemApi` with `getItemFunc` that calls `client.models.Document.get(...)`, and subscribes to `Document.onUpdate` to invalidate/update React Query cache.

**Example – list with subscriptions:**  
`src/hooks/api/documents/use-documents-by-user.api.ts`: uses `client.models.Document.list` (often via a paginated pattern), and `Document.onCreate/onUpdate` subscriptions to update local state.

### 2. Server-side Amplify (API routes, SSR)

- **Client**: `cookieBasedClient` from `src/lib/ssr/utils/request-helper.ts`. It is created with `generateServerClientUsingCookies` from `@aws-amplify/adapter-nextjs/data`, using `amplify_outputs.json` and `cookies()` from `next/headers`. This runs in Node (API routes or server components).
- **Usage**: In `src/app/api/**/route.ts` only. Use for operations that must run as the authenticated user on the server (e.g. creating a `Task` and `Message` when the user sends a chat message). Do **not** use React hooks in these files; use async route handlers and `cookieBasedClient.models.*`.
- **Helper**: `getUserId()` in the same file reads `userId` from cookies if needed.

**Example:**  
`src/app/api/ai/chat/route.ts`: `POST` handler receives body, then calls `cookieBasedClient.models.Message.create(...)` and `cookieBasedClient.models.Task.create(...)` to enqueue the AI chat task.

### 3. Next.js API routes (fetch from client)

- **Definition**: Route handlers in `src/app/api/**/route.ts` (e.g. `GET`, `POST`). They can use `cookieBasedClient`, call external APIs, or orchestrate logic.
- **Callers**: Browser code (hooks or components) calls these via `fetch('/api/...')`. No Amplify client in the browser for these; the route runs on the server and may use `cookieBasedClient` or other server-only code.
- **Typical flow**: User action → hook (e.g. mutation) → `fetch('/api/ai/chat', { method: 'POST', body: JSON.stringify(...) })` → route handler runs → returns JSON.

**Examples of API routes called from frontend:**

- `POST /api/ai/chat` – create message + task for AI chat (used by `src/hooks/api/chats/use-messages-by-chat.api.ts`).
- `POST /api/documents/store` – document upload (used by `src/hooks/api/documents/use-upload-document.api.ts`).
- `POST /api/flashcards/chat-tool` – add flashcard from chat.
- `POST /api/quizzes/create`, `POST /api/quizzes/delete`.
- `GET /api/paddle/prices`, `GET /api/paddle/discounts`.
- `GET /api/link-preview?url=...`.
- `POST /api/mock-exams`, `DELETE /api/mock-exams/[id]`.
- `GET /api/yt/fetch`, `POST /api/yt/store`.
- Admin: `POST /api/admin/neptune-query`, `GET /api/admin/ai-playground`.

### 4. Lambda functions

- **Definition**: Each Lambda has a folder under `amplify/functions/<name>/` with `resource.ts` (CDK definition) and `handler.ts` (entry). Some share code in `amplify/functions/common/` or `amplify/utils/`.
- **Invocation**: Lambdas are invoked by Amplify Data (custom queries/mutations in `amplify/data/resource.ts` that reference the function), or by other Lambdas/EventBridge. The Next.js app does **not** call Lambda HTTP URLs directly; it goes through Amplify Data or through Next.js API routes that may trigger workflows (e.g. creating a Task that a Lambda processes).

---

## Provider Hierarchy

Root layout wraps the app in `Providers` (`src/providers/providers.tsx`). Order (outer → inner):

1. **Theme** (Radix Themes)
2. **AnalyticsProvider** – analytics (e.g. track)
3. **MathJaxContext** – math rendering (better-react-mathjax)
4. **QueryClientProvider** – React Query
5. **Authenticator.Provider** – Amplify UI auth
6. **AmplifyProvider** – `useAmplifyApiClient` / `useAmplifyUserApiClient`
7. **SessionProvider** – session / user attributes
8. **CommonProvider** – UI state (sidebar, right panel)
9. **SpaceProvider** – current space
10. **CoreProvider** – core app state (e.g. current document, chat)
11. **ChatProvider** – chat state
12. **TooltipProvider** – Radix tooltips

When fixing auth/session/space/chat state, use the matching provider and its context hook (e.g. `useSessionContext`, `useCoreContext`, `useCommonContext`).

---

## Hook Patterns

- **Single item by ID**: `useItemApi` in `src/hooks/api/use-item.api.ts`. Takes `itemUuid`, `key`, and `getItemFunc` that returns `{ data }`. Uses React Query under the hood. Example: `use-document.api.ts`.
- **Paginated lists**: `usePaginatedQuery` in `src/hooks/api/use-paginated-query.api.ts`. Used for lists that support pagination and often combined with Amplify `list()`.
- **Real-time lists**: Many list hooks use `useSubscription` (`src/hooks/api/use-subscription.ts`) to subscribe to `onCreate/onUpdate/onDelete` and merge results into local state or React Query cache.
- **Mutations that hit API routes**: Hook uses `useMutation` (or plain `fetch`) and calls `fetch('/api/...')`. Example: `use-messages-by-chat.api.ts` sends `POST /api/ai/chat`.
- **Naming**: Data hooks are named `use-<entity>-<action>.api.ts` or `use-<entity>.api.ts` and live under `src/hooks/api/<domain>/`.

---

## Conventions

- **Client components**: Most pages and feature components are `'use client'` and use hooks for data. Do not use `cookies()` or server-only Amplify in client components.
- **Server usage**: Only in `src/app/api/**/route.ts` or server components: use `cookieBasedClient` and `cookies()` from `next/headers`. No React hooks in route handlers.
- **Imports**: Use `@/` aliases: `@/components/`, `@/hooks/api/`, `@/lib/`, `@/providers/`, `@/design-system/`.
- **Schema types**: Use `Schema` from `@amplify/data/resource` (or from `amplify/data/resource`) for types that mirror the Amplify schema (e.g. `Schema['Document']['type']`).
- **Design system**: Curio-specific components live in `src/design-system/` (e.g. `curio-button`, `curio-table`). Use these for consistent app UI; use `src/components/ui/` for generic primitives (Radix-based).

---

## Where to Fix Common Tasks (Detailed)

| Task | Where to look (detailed) |
|------|---------------------------|
| **Change a page** | `src/app/<segment>/page.tsx` or `src/app/<segment>/[param]/page.tsx`. Check layout in `src/app/layout.tsx` or segment-specific `layout.tsx`. |
| **Add or change API route** | `src/app/api/<segment>/route.ts` or `src/app/api/<segment>/<sub>/route.ts`. Use `cookieBasedClient` from `@/lib/ssr/utils` if you need Amplify on the server. |
| **Document list / upload / delete / move** | Hooks: `src/hooks/api/documents/*.ts` (use-documents-by-user, use-document, use-upload-document, use-delete-document, use-move-document). Upload often calls `POST /api/documents/store`. Schema: `amplify/data/resource.ts` (Document model). Lambdas: `amplify/functions/process-document-*`, `move-document`, `delete-document`. |
| **Chat / AI flow** | API: `src/app/api/ai/chat/route.ts`. Hooks: `src/hooks/api/chats/*.ts` (use-messages-by-chat posts to `/api/ai/chat`). UI: `src/components/core/chat/*`. Backend: `amplify/functions/ai-chat`, `amplify/functions/process-task-stream`. |
| **Auth / user context** | `src/providers/session-provider.tsx`, `src/providers/amplify-provider.tsx`. Auth config: `amplify/auth/resource.ts`. Triggers: `amplify/auth/post-authentication`, `post-confirmation`, `pre-signup`. Login/signup UI: `src/app/login`, `signin`, `signup`; Authenticator from `@aws-amplify/ui-react`. |
| **Payments / Paddle** | API: `src/app/api/paddle/*` (prices, discounts, webhooks). Lib: `src/lib/payments/*` (providers, server fulfillment). Hooks: `src/hooks/api/payments/*`, `src/hooks/use-paddle-*.ts`, `use-checkout.ts`. Lambdas: `amplify/functions/fulfill-purchase`, `transaction-completed`, `subscription-update`. |
| **UI component (generic)** | `src/components/ui/*.tsx` (button, card, input, select, tabs, etc.). Subfolders: `action-menu`, `file-browser`. |
| **UI component (Curio design system)** | `src/design-system/*.tsx` (curio-button, curio-dropdown, curio-table, curio-panel, etc.). Stories: `src/design-system/stories/`, `src/stories/`. |
| **Add or change data model** | `amplify/data/resource.ts` (schema + custom operations). Then add or update hooks in `src/hooks/api/<domain>/` and types in `src/lib/types/` if needed. |
| **Fix Lambda logic** | `amplify/functions/<name>/handler.ts` for logic; `amplify/functions/<name>/resource.ts` for CDK config. Shared code: `amplify/functions/common/`, `amplify/utils/`. |
| **Document processing pipeline** | `amplify/custom/ProcessDocument/` (pipeline definition, steps). Steps implemented in `amplify/functions/process-document-*` (create-summary, create-flashcards, categorise, file-type-detection, datalab-*, update-task-status). |
| **Mock exams** | Pages: `src/app/mock-exams/`, `[mockExamUuid]`. Hooks: `src/hooks/api/mock-exams/*`. API: `src/app/api/mock-exams/`, `src/app/api/mock-exam/`. Components: `src/components/mock-exams/`. Lambdas: `amplify/functions/mock-exams-generate-questions`, etc. |
| **Quizzes** | Hooks: `src/hooks/api/quizzes/*`. API: `src/app/api/quizzes/` (create, delete). UI: e.g. `src/components/core/as-tabs/space-quiz-as-tab.tsx`. |
| **Spaces** | Hooks: `src/hooks/api/spaces/*`. Provider: `src/providers/space-provider.tsx`. Pages: `src/app/spaces/[spaceId]`. |
| **Admin** | Pages: `src/app/admin/*`. Components: `src/components/admin/*`. API: `src/app/api/admin/*`. |

---

## Never

- Fetch data directly inside deeply nested presentational components; use hooks and pass data as props.
- Mix UI rendering and API logic in the same component; keep API calls in hooks or API routes.
- Use React hooks inside `src/app/api/**/route.ts`; only async route handlers and server-side APIs.
- Introduce new UI frameworks or state libraries; use the existing stack (see `stack.md`).
- Use Amplify Gen 1 patterns or docs; this project is Amplify Gen 2 (see `stack.md` and Amplify version rule).
