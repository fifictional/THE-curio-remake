# Project Stack

## Frontend

* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript
* **React**: v18

## UI

* **@radix-ui** – use only the packages already installed (see `ui-components.md`); do not install new Radix packages unless needed:
  * `@radix-ui/react-checkbox`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`
  * `@radix-ui/themes` (theme wrapper)
* **TailwindCSS** v4
* **Framer Motion**
* **class-variance-authority** (CVA)
* **lucide-react** (icons)
* **tailwind-merge**, **clsx**

## State & Data

* **React Query** (@tanstack/react-query) for server state
* **React Hook Form** + **@hookform/resolvers** for forms

## Backend / AWS (Amplify Gen 2)

* **AWS Amplify** (auth, data, storage)
* **Lambda** functions for AI chat, document processing, payments, etc.
* **DynamoDB**, **S3**, **Neptune**, **OpenSearch**, **SQS**, **Bedrock**, **Textract**
* **CDK** (aws-cdk-lib) for infrastructure

## AI / LLM

* **OpenAI**
* **Google Gemini** (@google/genai, @google/generative-ai)
* **AWS Bedrock** (anthropic models via Bedrock)

## Payments

* **Paddle** (@paddle/paddle-js)

## Charts & Visualisation

* **Recharts**

## Editor & Documents

* **Monaco Editor** (@monaco-editor/react)
* **react-pdf** for PDF viewing
* **pdf-lib** for PDF generation
* **react-markdown** + **remark-gfm**, **rehype-raw**
* **better-react-mathjax** for math

## Analytics & Tracking

* **Mixpanel**
* **Customer.io** (@customerio/cdp-analytics-node)

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
├── components/           # Feature & shared UI (ui/, core/, layout/, admin/, etc.)
├── design-system/       # Curio design system (curio-* components)
├── hooks/               # React hooks, incl. hooks/api/* for API data
├── lib/                 # Utils, types, payments, analytics, SSR helpers
├── providers/           # React context providers
└── stories/             # Storybook stories

amplify/
├── auth/                # Cognito triggers (post-auth, pre-signup, etc.)
├── ai/                  # AI agents, providers, tools, intents
├── custom/              # Custom constructs (ProcessDocument, queues, OpenSearch)
├── functions/           # Lambda handlers
├── storage/             # S3 buckets
├── utils/               # Neptune, OpenSearch, meta helpers
└── backend.ts           # Amplify backend definition
```

## Testing

* **Vitest** (unit tests)
* **Playwright** (E2E)
* **Storybook** (UI component development & documentation)

## Rules for AI Agents

* Prefer existing libraries already used in the repo
* Do not introduce new UI frameworks
* Do not introduce new state management libraries
* Always reuse existing components
* Use Amplify Gen 2 patterns; avoid Gen 1 docs
