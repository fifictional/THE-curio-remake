# Feature parity — old Curio vs the replacement

The rule from ADR 0004 is "the UI must look and behave exactly like the original".
This is the checklist that makes that measurable: every product route in `ui/`
(64 routes, 28 of them non-admin), what it does, and where the replacement stands.

Status: **done** · **partial** (works, missing pieces) · **missing** · **dropped**
(decided) · **blocked** (needs a decision, a key, or a role model).

Last updated: 2026-11-19.

## Screens

| Legacy route | What it does | Replacement |
|---|---|---|
| `/` | greeting, create a chat | **done** — greeting, first message creates the chat |
| `/chats/[chatUuid]` | open a conversation, sources panel, tools | **partial** — messages, markdown/maths, citations, polling, ceiling: no tool cards, no rename/delete, no attachments, no web search |
| `/library` | documents + folders, upload, analytics | **partial** — list, search, upload, **folders (create/file), grouping**; missing delete, upload task status, folder rename/delete |
| `/documents/[docUuid]` | PDF viewer + summary + chat + flashcards + quiz tabs | **done** — tabs (Summary / Document / Chat / Flashcards / Quiz), in-app PDF viewer through `/files`, document's own saved conversation, delete. Generation still missing (see below) |
| `/spaces/[spaceId]` | folder: chats, documents, flashcards, quizzes | **partial** — chats, documents, rename/delete, **sharing (invite/levels/remove)**; missing flashcards/quiz tabs |
| `/spaces/[spaceId]/chats/[chatUuid]` | chat inside a folder | **done** (via `/?chat=`) |
| `/spaces/[spaceId]/documents/[docUuid]` | document inside a folder | **done** (via `/documents/<uuid>`) |
| `/profile` | personal info, subscription, delete account | **partial** — read-only info, subscription display, export/delete; missing editing name/country |
| `/settings` | app settings, memory toggle, subscription | **partial** — account, export/delete; missing memory toggle, subscription management |
| `/metadata/[targetId]` | metadata rows for an entity | **done** |
| `/signin`, `/login`, `/signup` | auth | **done** (`/`, `/forgot`, `/reset`) |
| `/reset` | password reset | **done** |
| `/onboarding` | first-run flow | **done** — rebuilt as `/welcome`: lifestage → intents → first document; the old pricing step is gone with payments |
| `/onboarding/demo/[docUuid]` | demo document tour | **missing** (the tour pointed at the dropped practice flows) |
| `/welcome`, `/welcome/end` | post-signup welcome | **done** — one screen with three steps, ends in the chat instead of `/welcome/end` |
| `/companion/upload` | desktop-companion upload | **missing** |
| `/exam-bundles` | pricing / bundles | **partial** — pricing page exists in `ui/` only; checkout is **blocked** on payments |
| `/gifting`, `/gifting/success` | gift a subscription | **blocked** (payments) |
| `/one-dollar`, `/one-dollar/success` | trial offer | **blocked** (payments) |
| `/partner/[partnerCode]`, `/partner/success/…` | partner pricing | **blocked** (payments) |
| `/admin/*` (36 routes) | review, statistics, question extraction, knowledge base, bundles, partnerships | **blocked** — no role model; every admin route is unreachable today |

## Capabilities that are not screens

| Capability | Legacy | Replacement |
|---|---|---|
| Chat tools (create flashcards / quiz from a message) | yes | **missing** — the server has no tool pipeline; cards are view-only |
| Flashcard & quiz **generation** | yes | **missing** (needs the tool pipeline + a key) |
| Flashcards/quiz **review** per document/space | yes | **done** (read-only list on the document page) |
| Document chat (one chat per document) | yes | **done** — the Chat tab creates the document's chat on first message and reuses it |
| Document deletion | yes | **done** (confirm, then cascades summaries/tasks/chunks) |
| Chat rename / delete | yes | **missing** (bridge supports it) |
| Move chat/document between folders | yes | **partial** — documents yes, chats no |
| Folder rename / delete | yes | **missing** |
| Folder **sharing** (owner/editor/viewer via `space_users`) | yes | **done** — invite by email, levels enforced by RLS (viewers read, editors write), removal; `spaces`/`documents`/`chats` policies admit members |
| Memory (persistent learner memory): toggle, blocks, export, backfill | yes | **partial** — read-only: blocks (gaps / mastered), on-off switch, JSON export, clear. Writing new blocks needs the reflection agent (a model), so backfill is not there |
| Global search (documents, chats) | via library search | **partial** — library search only |
| In-app PDF viewer | yes | **done** (browser engine via `/files`; other types fall back to a download link) |
| Attachments / image messages | yes | **missing** |
| Web search with URL citations | yes | **missing** (citations are document-based now) |
| Message actions (copy, vote up/down) | yes | **missing** |
| Analytics events (Mixpanel) | yes | **missing** (no provider configured) |
| Billing, tiers, entitlements | yes | **blocked** (payments decision) |
| OCR for scanned PDFs | via Datalab | **blocked** (provider decision) |
| Realtime updates | AppSync subscriptions | **done** differently — 4s polling |

## Features dropped by decision (2026-11-17)

Practice/mock tests, the learning profile, SAT prep — routes and bridge models
deleted, data kept. Not part of parity.

## How this gets closed

Order chosen by user value per unit of work; each item lands as its own commit with
a browser check:

1. ~~Folder management — rename, delete, file chats; sharing with invite/levels~~ (done)
2. **Chat actions** — rename, delete, move to folder, copy message.
3. ~~Document completeness — in-app PDF viewer, delete, per-document chat, tabs~~ (done)
4. ~~Onboarding / welcome — rebuilt as lifestage → intents → first document~~ (done)
5. ~~Memory — read-only blocks, toggle, export, clear~~ (done; reflection needs a key)
6. **Chat tools** — flashcard/quiz generation (needs the tool pipeline and a key).
7. **Blocked**: payments, admin, OCR — decide first, then build.
