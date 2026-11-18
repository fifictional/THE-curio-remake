# Open decisions

Everything here needs an answer from the team, not code. Each one names the options,
the recommendation, and what it unblocks. Decisions already taken live in
[`decisions.md`](decisions.md).

Last updated: 2026-11-18.

---

## Decided recently

| Decision | Answer |
|---|---|
| Imported users' passwords | **Forced reset** — Cognito hashes cannot be verified, so users set a new one from the sign-in screen; everything else is already migrated (§2e of the runbook). |
| Which features ship | Chat + documents/library. Practice/mock tests, learning profile and SAT prep are out of scope. |

---

## 1. Hosting — where does this run?

**Unblocks:** deployment, CI/CD, everything operational.

| Option | Cost | Notes |
|---|---|---|
| Managed Postgres + a container host (Neon/Railway/Fly/Render) | lowest effort | one vendor for the DB, one for the app; TLS and secrets come with it |
| AWS again (RDS + ECS/Fargate) | highest effort | no data leaves AWS, but we rebuild the thing we are leaving |
| Something you already pay for | varies | cheapest if it exists |

**Recommendation:** managed Postgres + one container host; keep AWS only for S3 and the
Cognito migration window. Nothing in the code assumes a provider.

Also needed with this: a domain, a secrets store, and whether the polling worker runs
as its own process or inside the API (it is a separate role either way —
`curio_service`).

---

## 2. Production data migration — what moves?

**Unblocks:** cutover. Code is written (`migration-runbook.md`); three calls are missing.

| Question | Recommendation |
|---|---|
| `DocumentVisionOutput` (1.55M rows, 80% of the migration, regenerable) | **exclude** |
| `UserRequest` (394k rows of AI-call audit) | **window to 90 days** (rate limits only need recent rows) |
| Who holds read-only AWS credentials, and where does staging live? | a named owner + a staging database, separate from prod |

Also needs: a write-freeze window, and agreement that the old stack stays read-only for
two weeks as the rollback.

---

## 3. Launch scope — what must the new UI cover before `ui/` is deleted?

Ported: chat, library, document, spaces, profile, settings, metadata, password reset.
Not ported: `/onboarding`, `/welcome`, `/gifting`, `/one-dollar`, `/partner/[code]`,
`/companion/upload`, `/exam-bundles` detail.

Several of those are paywall flows, so this is really the payments question (below).
**Recommendation:** launch on the ported screens, keep `ui/` only for the commerce pages
until payments are decided, then delete it.

---

## 4. Payments — keep Paddle or launch free?

**Unblocks:** whether `/exam-bundles`, the upgrade CTAs and tier checks stay.

- **Keep Paddle:** needs an account, sandbox keys, SKU mapping (the bundle data exists),
  and a webhook secret. That is a real integration, not a config change.
- **Launch free:** remove the pricing surface rather than leave buttons that do nothing.

**Recommendation:** launch free; add payments as its own project once logins and hosting
are settled. The data (168 subscriptions, 4 purchases) is already migrated either way.

---

## 5. Admin tooling — needed or not?

**Unblocks:** question extraction, chats review, statistics, knowledge base. All are
unreachable today because there is no role model.

If yes: I need the **Cognito group membership** for admins so `users.role` can be
populated, then admin RLS policies. If no: delete those screens with `ui/`.

**Recommendation:** defer unless operations need question extraction at launch.

---

## 6. Flashcards and quizzes — generate or view-only?

Viewing migrated cards/quizzes works. Generating them needs the chat tool pipeline ported
(AI cost per request). With practice tests dropped, is generation still wanted?

**Recommendation:** view-only for launch.

---

## 7. Scanned PDFs — OCR, Datalab, or accept the gap?

Text-layer PDFs are parsed today; scans produce no summary.

| Option | Cost | Quality |
|---|---|---|
| tesseract locally | free | poor on formulas/diagrams |
| Datalab (what the old pipeline used) | paid per page | good layout/bboxes |
| Accept the gap | free | scans get "no summary available" |

**Recommendation:** accept the gap for launch; Datalab only if scanned material is common.

---

## 8. Email provider

**Unblocks:** reset emails (the forced-reset strategy), verification, migration comms.
Today the reset link is written to `.local/reset-links.log` and stdout; swapping the
`sendResetPassword` function for Resend/Postmark/SES is the whole integration.

Needs: provider choice, sender domain, and who owns the account.

---

## 9. Open source — is this going public?

If yes:

- **History purge** of `users.json` (30 MB of real user records) and `debug.txt` from the
  old repo. Irreversible; needs a clear yes and a backup.
- License choice, and whether the old repo stays public.
- Confirm nothing else in either repo holds customer data (`docs/migration/raw` is
  already gitignored).

---

## 10. Data retention and deletion

Account deletion currently hard-deletes: rows (cascade), files on disk, vectors in
Qdrant. Export is a JSON dump of the caller's own rows.

Open questions: is hard deletion right, or does legal want anonymisation with retained
aggregates? How long do `user_request` / `user_action_log` rows live? Is the JSON export
sufficient for a data-subject request?

---

## What I would do next, in order

1. **Hosting** (blocks deployment).
2. **Production migration scope + credentials** (blocks cutover).
3. **Email provider** (blocks the forced-reset campaign that #1 depends on).
4. Everything else can follow after a launch on chat + documents.
