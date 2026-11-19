/**
 * Row-level security + the role model.
 *
 * Three roles, three jobs:
 *   - the **owner** (whoever runs migrations) owns the schema and is the only
 *     role that can enable/disable RLS or add policies — never given to the app
 *   - `curio_service` runs background work for no single request (polling
 *     worker, indexer) and needs BYPASSRLS: FORCE RLS applies to the table owner
 *     too unless it is a superuser, which it is not on managed Postgres
 *   - `curio_app` serves requests: LOGIN, NOBYPASSRLS, owns nothing, so it can
 *     only ever see what a policy allows
 *
 * The four auth tables (`users`, `sessions`, `accounts`, `verifications`) are
 * deliberately excluded: Better Auth writes them before any user context exists,
 * so a policy keyed on `app.user_id` would make sign-up impossible.
 *
 * `FORCE ROW LEVEL SECURITY` matters: without it, the table owner (our `curio`
 * role) bypasses policies, so the app would *look* protected and not be.
 *
 * The per-request user is set with `set_config('app.user_id', ..., true)` inside
 * a transaction — see `server/db/scope.ts`.
 *
 * Run after migrations:  npm run db:rls
 */

import 'dotenv/config';

import { ownerSql as sql } from './owner-client';

const tables = [
  'flashcards',
  'questions',
  'space_users',
  'tasks',
  'user_requests',
  'user_action_logs',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'flashcard_decks',
  'document_chunks',
] as const;

/** Tables whose ownership comes from their document, not their own column. */
const documentOwned = ['document_summaries'] as const;

/**
 * Tables that key ownership on `owner_uuid` (the memory feature uses it as the
 * owner of a block, which is not always the same as the row's user).
 */
const ownerUuidTables = ['memory_blocks', 'memory_candidates'] as const;

/** Citations key on the chat they belong to. */
const chatOwned = ['chat_citations'] as const;

/** Tables that key ownership on `user_id` rather than `user_uuid`. */
const userIdTables = ['purchases', 'curio_subscriptions', 'receipts'] as const;

/**
 * Tables that hang off another row. Empty right now: the two that used it
 * (`mock_exam_logs`, `exam_paper_questions`) belong to dropped features and are
 * owner-only below. Kept as the documented pattern for the next one.
 */
const viaParent: Array<{ table: string; parent: string; fk: string; parentPk: string }> = [];

/**
 * Configuration and seed content: readable by any signed-in caller, writable by
 * nobody through the app. A `select`-only policy is how Postgres says that.
 * (`AppSettings` has 21 rows in dev because nothing stopped the old UI creating
 * one per session; the bridge reads the newest.)
 */
const publicRead = [
  'partnerships',
  'app_settings',
  'mock_documents',
  // Pricing catalogue and shared video content: no owner column exists, and the
  // rows are the same for everyone.
  'bundles',
  'exam_modules',
  'youtube_videos',
] as const;

/**
 * Not reachable by the app at all: PII we have no role model for yet, and
 * internal job state. RLS on with no policy means only the owner role (the
 * importer, the local pipeline) can touch them.
 */
const ownerOnly = [
  // PII we have no role model for, and internal job state.
  'future_users',
  'batch_processes',
  // Dropped features (practice tests, learning profile, SAT prep). The data is
  // migrated and kept, but no product code reads it — so the app role gets
  // nothing. Re-enabling a feature means restoring its policy here, on purpose.
  'extracted_questions',
  'exam_papers',
  'exam_paper_questions',
  'mock_exams',
  'mock_exam_logs',
  'sat_mini_exam_logs',
  'flashcard_games',
  'question_extract_jobs',
  'question_generation_jobs',
  'user_learning_profile_history',
  // Pipeline output: written by the worker as the owner, never read by the app.
  'document_sections',
  'document_vision_outputs',
  'datalab_requests',
] as const;

async function main() {
  // A superuser bypasses RLS even with FORCE. The application must therefore
  // connect as a plain role that owns nothing.
  await sql.unsafe(`
    do $$
    begin
      if not exists (select from pg_roles where rolname = 'curio_app') then
        create role curio_app login password 'curio_app' nosuperuser nobypassrls;
      end if;
      -- Background work acts for no single request: it needs the bypass, and it
      -- is a different credential from the app on purpose.
      if not exists (select from pg_roles where rolname = 'curio_service') then
        create role curio_service login password 'curio_service' nosuperuser bypassrls;
      end if;
    end $$;
  `);

  for (const role of ['curio_app', 'curio_service'] as const) {
    await sql.unsafe(`grant usage on schema public to ${role}`);
    await sql.unsafe(
      `grant select, insert, update, delete on all tables in schema public to ${role}`,
    );
  }
  console.log('  roles curio_app (nobypassrls), curio_service (bypassrls), owner (migrations)');

  for (const table of tables) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (user_uuid = current_setting('app.user_id', true)::uuid)
      with check (user_uuid = current_setting('app.user_id', true)::uuid)
    `);
    console.log(`  rls  ${table}`);
  }

  for (const table of chatOwned) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (
        user_uuid = current_setting('app.user_id', true)::uuid
        or exists (
          select 1 from chats c
          where c.chat_uuid = ${table}.chat_uuid
            and c.user_uuid = current_setting('app.user_id', true)::uuid
        )
      )
      with check (
        user_uuid is null
        or user_uuid = current_setting('app.user_id', true)::uuid
      )
    `);
    console.log(`  rls  ${table} (chat or user_uuid)`);
  }

  for (const table of ownerUuidTables) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (owner_uuid = current_setting('app.user_id', true)::uuid)
      with check (owner_uuid = current_setting('app.user_id', true)::uuid)
    `);
    console.log(`  rls  ${table} (owner_uuid)`);
  }

  for (const table of userIdTables) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (user_id = current_setting('app.user_id', true)::uuid)
      with check (user_id = current_setting('app.user_id', true)::uuid)
    `);
    console.log(`  rls  ${table} (user_id)`);
  }

  for (const { table, parent, fk, parentPk } of viaParent) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (
        exists (
          select 1 from ${parent} p
          where p.${parentPk} = ${table}.${fk}
            and p.user_uuid = current_setting('app.user_id', true)::uuid
        )
      )
      with check (
        exists (
          select 1 from ${parent} p
          where p.${parentPk} = ${table}.${fk}
            and p.user_uuid = current_setting('app.user_id', true)::uuid
        )
      )
    `);
    console.log(`  rls  ${table} (via ${parent})`);
  }

  for (const table of documentOwned) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (
        exists (
          select 1 from documents d
          where d.document_uuid = ${table}.document_uuid
            and d.user_uuid = current_setting('app.user_id', true)::uuid
        )
      )
      with check (
        exists (
          select 1 from documents d
          where d.document_uuid = ${table}.document_uuid
            and d.user_uuid = current_setting('app.user_id', true)::uuid
        )
      )
    `);
    console.log(`  rls  ${table} (via documents)`);
  }

  // messages has no user_uuid — ownership comes from its chat.
  await sql.unsafe('alter table messages enable row level security');
  await sql.unsafe('alter table messages force row level security');
  await sql.unsafe('drop policy if exists own_rows on messages');
  await sql.unsafe(`
    create policy own_rows on messages
    using (
      messages.user_uuid = current_setting('app.user_id', true)::uuid
      or exists (
        select 1 from chats c
        where c.chat_uuid = messages.chat_uuid
          and c.user_uuid = current_setting('app.user_id', true)::uuid
      )
    )
    with check (
      messages.user_uuid is null
      or messages.user_uuid = current_setting('app.user_id', true)::uuid
    )
  `);
  console.log('  rls  messages (via chats)');

  /*
   * Shared folders.
   *
   * A folder is visible to its owner *and* to anyone with a `space_users` row.
   * The subquery is safe from policy recursion because `space_users` itself is
   * scoped by its own `user_uuid`, so it exposes only the caller's memberships.
   * Editors (level <= 1) may write inside the folder; viewers (2) may only read.
   */
  const membership = (table: string) => `
    exists (
      select 1 from space_users su
      where su.space_uuid = ${table}.space_uuid
        and su.user_uuid = current_setting('app.user_id', true)::uuid
    )`;
  const editor = (table: string) => `
    exists (
      select 1 from space_users su
      where su.space_uuid = ${table}.space_uuid
        and su.user_uuid = current_setting('app.user_id', true)::uuid
        and su.level <= 1
    )`;

  await sql.unsafe('alter table spaces enable row level security');
  await sql.unsafe('alter table spaces force row level security');
  await sql.unsafe('drop policy if exists own_rows on spaces');
  await sql.unsafe(`
    create policy own_rows on spaces
    using (
      user_uuid = current_setting('app.user_id', true)::uuid
      or ${membership('spaces').replaceAll('spaces.space_uuid', 'spaces.space_uuid')}
    )
    with check (user_uuid = current_setting('app.user_id', true)::uuid)
  `);
  console.log('  rls  spaces (owner or member)');

  for (const table of ['documents', 'chats'] as const) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`
      create policy own_rows on ${table}
      using (
        user_uuid = current_setting('app.user_id', true)::uuid
        or ${membership(table)}
      )
      with check (
        user_uuid = current_setting('app.user_id', true)::uuid
        or ${editor(table)}
      )
    `);
    console.log(`  rls  ${table} (owner, member may read, editor may write)`);
  }

  /*
   * `metadata` is polymorphic: a key/value row pointing at a user, chat or
   * document by text id. Ownership therefore has to be derived from the target,
   * and the comparison stays textual so a malformed id cannot fail the cast and
   * return true/false by accident.
   */
  await sql.unsafe('alter table metadata enable row level security');
  await sql.unsafe('alter table metadata force row level security');
  await sql.unsafe('drop policy if exists own_rows on metadata');
  await sql.unsafe(`
    create policy own_rows on metadata
    using (
      (target_type = 'user'
        and target_uuid = current_setting('app.user_id', true))
      or (target_type = 'chat'
        and exists (
          select 1 from chats c
          where c.chat_uuid::text = metadata.target_uuid
            and c.user_uuid = current_setting('app.user_id', true)::uuid
        ))
      or (target_type = 'document'
        and exists (
          select 1 from documents d
          where d.document_uuid::text = metadata.target_uuid
            and d.user_uuid = current_setting('app.user_id', true)::uuid
        ))
    )
    with check (
      (target_type = 'user'
        and target_uuid = current_setting('app.user_id', true))
      or (target_type = 'chat'
        and exists (
          select 1 from chats c
          where c.chat_uuid::text = metadata.target_uuid
            and c.user_uuid = current_setting('app.user_id', true)::uuid
        ))
      or (target_type = 'document'
        and exists (
          select 1 from documents d
          where d.document_uuid::text = metadata.target_uuid
            and d.user_uuid = current_setting('app.user_id', true)::uuid
        ))
    )
  `);
  console.log('  rls  metadata (via target)');

  for (const table of publicRead) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    await sql.unsafe(`drop policy if exists read_all on ${table}`);
    await sql.unsafe(`create policy read_all on ${table} for select using (true)`);
    console.log(`  rls  ${table} (read-only for everyone)`);
  }

  for (const table of ownerOnly) {
    await sql.unsafe(`alter table ${table} enable row level security`);
    await sql.unsafe(`alter table ${table} force row level security`);
    // Whatever it had before stops applying: no policy means no app access.
    await sql.unsafe(`drop policy if exists own_rows on ${table}`);
    await sql.unsafe(`drop policy if exists read_all on ${table}`);
    await sql.unsafe(`drop policy if exists write_own on ${table}`);
    console.log(`  rls  ${table} (no policy: owner only)`);
  }

  console.log('\nrow-level security applied');
}

await main();
await sql.end();
process.exit(0);
