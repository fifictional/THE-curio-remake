# 0004 — Run the original UI, don't reimplement it

**Status:** Accepted (2026-11-13)
**Supersedes:** the plan to rebuild the chat screen inside TanStack Start

## Context

The requirement is "the UI must look exactly like the original". Porting it to
TanStack Start would mean reproducing **256 files**: the chat screen's import
closure (`chat-viewer` → `chat` → `messages` → `message-ui`) pulls 101
components, 106 hooks, 10 providers and 32 lib files — all written against
Amplify's `client.models.*`.

Reimplementing that cannot be "exactly" anything; it is a rewrite of the
product surface.

## Decision

**Strangler pattern.** `ui/` is the original frontend, copied unchanged, running
on Next.js against the new API. Screens move to `web/` (TanStack Start) one at a
time, and are diffed against `ui/` for parity.

Three shims make the original code run against the new stack — and nothing else
in `ui/src` was touched:

| Shim | File | Replaces |
|---|---|---|
| Data bridge | `ui/src/lib/local-data-client.ts` | `generateClient<Schema>()` → `POST /db` |
| Auth | `ui/src/lib/local-auth.ts`, `local-auth-react.ts` | Cognito session / `useAuthenticator` |
| Config | `ui/amplify_outputs.json` (stub, gitignored) | generated Amplify outputs |

Patched call sites (4 files): `providers/amplify-provider.tsx`,
`providers/session-provider.tsx`, `app/login/page.tsx`, and the 4 SAT-mini pages
that import `useAuthenticator`.

Two further patches are **bug fixes found by running the app**, not shims:

- `components/core/curio-markdown.tsx` — `<MathJax>` wrapped nested containers
  *and* their children, and it was applied to plain text. A single document page
  started ~51 `typesetPromise` calls, all of which rejected with
  `Typesetting failed: … nextSibling`, leaving the maths unrendered. It is now
  skipped when the text contains no maths, and only wrapped on leaf blocks.
- `providers/providers.tsx` — MathJax v3 does not support concurrent
  `typesetPromise` calls; the provider queues them (`onStartup` + a promise
  chain), which is MathJax's own documented requirement.

The TanStack replacement's noted blocker is gone: `web/` is server-rendered and its
loader forwards the session cookie to the API (`web/src/server/`), so the first
paint is the real conversation rather than an empty shell. It also renders markdown
+ KaTeX, and the message layout matches the original (student bubble right, tutor
text left). Per-screen parity is still the open work.

`ui/` also carries a Playwright smoke test (`npm run smoke`, config in
`ui/playwright.smoke.config.ts`): it walks the migrated screens against the real
database and fails on uncaught errors, console errors, 5xx or an error boundary.
That is how both bugs above were found, and it is the per-screen parity check the
exit criteria below need.

Server side, `POST /db` (`server/routes/db.ts`) answers
`{ model, method, args, options }` from Postgres **inside `asUser()`**, so RLS
still decides visibility. Unknown models return empty data so unmigrated screens
render an empty state instead of crashing.

## Consequences

- Pixel parity is guaranteed by construction: it is the same code.
- `ui/amplify/` is copied for type imports (`@amplify/data/resource` →
  `Schema`). It is **not deployed** and must not be treated as the backend.
- Next.js stays in the tree during the transition (it is the thing being
  removed), so the Next CVEs remain a risk until the last screen moves.
- The bridge's `/db` is a wide surface: it must stay behind session auth + RLS,
  and it is deliberately not exposed to the new `web/` client.

## Exit criteria

`ui/` is deleted when every screen in `web/` matches it. Track per-screen.

Screens for the features dropped on 2026-11-17 (practice/mock tests, learning profile,
SAT prep) do not need a `web/` equivalent — they were deleted rather than ported: five
route groups, ~60 components/hooks, and the exam tabs in the chat panel. See
`docs/decisions.md` for the full list.
