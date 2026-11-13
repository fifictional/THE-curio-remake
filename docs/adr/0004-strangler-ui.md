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
