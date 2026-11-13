# Debugging Strategy

When fixing issues, follow this process and use the tools below. Prefer minimal, targeted fixes and verify with type-check and tests.

---

## General Process

1. **Reproduce** – Reproduce the bug using the reported steps (or write them down if you found it).
2. **Locate** – Identify the responsible layer: UI component, hook, API route, or Lambda. Use the “Where to fix” table in `architecture.md` to find the right files.
3. **Inspect** – Add temporary logs or use breakpoints only where needed; check network, state, and backend logs as relevant.
4. **Fix** – Implement the smallest change that fixes the bug. Avoid refactors or rewrites.
5. **Verify** – Run `npm run type-check`, `npm run lint`, and relevant tests (`npm run test`, `npm run test:e2e`). Manually confirm the fix if tests don’t cover the path.


**If possible, write a test to reproduce the issue reliably** (unit or E2E) before or with the fix. That guards against regressions and makes the bug easier to debug later. See `testing.md` for where to add tests.

---

## Frontend (Browser / Next.js App)

### Where errors show up

- **Data loading**: Hooks in `src/hooks/api/*` often return `isLoading`, `isError`, `error`, or throw. Check the hook’s return value and how the component handles it (e.g. loading spinner, error message).
- **Mutations**: `useMutation` from React Query returns `isPending`, `isError`, `error`; mutations that call `fetch('/api/...')` may surface API errors in the response body. Check the mutation’s `onError` or returned `error` and any toast/UI that displays it.
- **Amplify Data**: `client.models.*` calls return `{ data, errors }`. Many hooks log `response.errors` with `console.error` and may not surface them in UI; search for `response.errors` or `console.error` in the hook when debugging failed creates/updates.

### Useful techniques

- **Browser DevTools**: Network tab for failed API or Amplify requests (status, response body). Console for `console.error` / `console.log` from hooks and components. Elements to inspect layout, overflow, and z-index.
- **React DevTools**: Inspect component tree and props; check which provider or hook is providing the data that’s wrong or missing.
- **Temporary logging**: Use `console.error` or `console.log` in the hook or component that owns the flow; remove before committing. Prefer logging in hooks (where the data/error originates) rather than deep in presentational components.
- **URL and params**: For dynamic routes (`/documents/[docUuid]`, `/chats/[chatUuid]`), confirm the param is correct and that the hook is called with the right ID (e.g. from `useParams()`).

### Common UI issues

| Issue | What to check |
|-------|----------------|
| **Clicks not working** | `pointer-events` (e.g. `none` on a parent), overlapping overlay with higher z-index, or disabled state on button. |
| **Dropdown/menu behind content** | z-index stacking; Radix portals (dropdowns render in a portal – check parent that might have `overflow: hidden` or a new stacking context). |
| **Dropdown cut off** | Parent container `overflow: hidden`; ensure the Radix trigger/content aren’t inside a scrollable or clipped container that clips the portal. |
| **Wrong data on screen** | Stale React Query cache (e.g. wrong `queryKey` or missing invalidation after mutation); wrong `documentUuid` / `chatUuid` / `spaceUuid` passed into hook. |
| **Loading forever** | Hook never gets a successful response (API/Amplify error, auth, or wrong ID); subscription or real-time update not firing. Check Network and hook’s `isLoading` / `error`. |

---

## API Routes (Next.js)

- **Location**: `src/app/api/**/route.ts`. No React hooks; only async request handlers.
- **Logging**: Use `console.log` / `console.error`; they appear in the terminal where `next dev` (or `next start`) is running.
- **Debugging**: Add temporary `console.error` with request body or key variables; check terminal output. Use `getUserId()` from `@/lib/ssr/utils` to confirm auth when needed.
- **Errors**: Return appropriate status and JSON (e.g. `NextResponse.json({ error: '...' }, { status: 400 })`). Check that the client (hook) reads the response and surfaces the error.

---

## Lambda (Backend)

- **Logger**: Use **@aws-lambda-powertools/logger** (`Logger`). Pattern used in the repo:
  ```ts
  import { Logger } from "@aws-lambda-powertools/logger";
  const logger = new Logger({ logLevel: "INFO", serviceName: "your-handler-name" });
  logger.info("message", { key: value });
  logger.error("message", { error });
  ```
- **Where to look**: CloudWatch Logs for the function’s log group (e.g. `/aws/lambda/...`). Log level is typically INFO; use `logger.debug` for verbose data and ensure log level supports it if needed.
- **Env vars**: Lambdas get config from `resource.ts` (e.g. `addEnvironment`) or from Amplify/backend. If something is undefined, check the function’s environment in the CDK definition and in CloudWatch.
- **Invocation**: For custom mutations/queries, the schema in `amplify/data/resource.ts` wires the Lambda. For document processing, the Task table stream → process-task-stream → SQS → Step Functions. Check Task status and Step Functions execution history when debugging pipeline issues.
- **Secrets**: If the Lambda reads from Secrets Manager, confirm the secret name and that the function role has `secretsmanager:GetSecretValue` (see `backend.ts` for `grantRead`).

---

## Document Processing & Async Flows

- **Flow**: Upload → Document + Task created → DynamoDB stream → process-task-stream Lambda → SQS → Step Functions (convert, file-type-detection, extract-and-embed, categorise, summary, flashcards, datalab, update-task-status).
- **Debugging**:  
  - **Task stuck PENDING**: Stream or SQS might not be triggering; check process-task-stream Lambda logs and SQS queue.  
  - **Task FAILED**: Check the Step Functions execution for the failed state and the Lambda logs for that step (e.g. process-document-create-summary, process-document-categorise).  
  - **Summary/flashcards never appear**: Confirm Task reaches COMPLETED and that the update-task-status Lambda (and any step that writes DocumentSummary/FlashcardDeck) ran successfully; check Amplify Data model and permissions.
- **Local**: With `npx ampx sandbox`, Lambdas run locally or in the cloud depending on config; check where the stream and SQS are pointing (local vs deployed).

---

## Tests & Verification

- **Type-check**: `npm run type-check` (Next.js + Amplify). Fix type errors first; they often reveal wrong types or missing null checks.
- **Lint**: `npm run lint`. Fix reported issues in the files you changed.
- **Unit tests**: `npm run test` (Vitest). Add or update tests when fixing logic; run the relevant describe/file.
- **E2E**: `npm run test:e2e` (Playwright). Tests live in `e2e/*.spec.ts`. For failing E2E:
  - **Debug mode**: `npm run test:e2e:debug` to run with Playwright Inspector (step through, inspect selectors).
  - **UI mode**: `npm run test:e2e:ui` to open the Playwright UI and run or debug tests.
  - **Report**: `npm run test:e2e:report` to view the last HTML report (screenshots, trace on failure). Config uses `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`.
- **Base URL**: E2E uses `baseURL: 'http://localhost:3000'` by default. Ensure the app is running on that URL when running E2E locally.

---

## Checklist Before Submitting a Fix

- [ ] Bug is reproduced and the root cause is in the identified layer (UI, hook, API route, or Lambda).
- [ ] Fix is minimal (no large refactors or new libraries unless required).
- [ ] `npm run type-check` passes.
- [ ] `npm run lint` passes (or only pre-existing issues remain).
- [ ] Relevant tests added or updated and passing (`npm run test` and/or `npm run test:e2e` as appropriate).
- [ ] Temporary `console.log` / `console.error` or debug code added for investigation are removed.
- [ ] No breaking changes to existing APIs or component contracts unless intentional and documented.

---

## Never

- Rewrite large parts of the codebase to “fix” a bug; fix the specific cause.
- Introduce breaking changes (e.g. changing hook return shape or API response) without updating all callers.
- Replace existing libraries (e.g. Radix, React Query) as part of a bug fix.
- Leave `console.log` or temporary debug code in the commit.
- Commit with type-check or lint errors in the files you changed.
