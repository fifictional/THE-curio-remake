/**
 * Row-level security.
 *
 * Applied to the six DATA tables. The four auth tables (`users`, `sessions`,
 * `accounts`, `verifications`) are deliberately excluded: Better Auth writes
 * them before any user context exists, so a policy keyed on `app.user_id`
 * would make sign-up impossible. Those are protected by session-token logic.
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

import { sql } from './client';

const tables = ['spaces', 'documents', 'chats', 'flashcards', 'questions'] as const;

async function main() {
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

  // messages has no user_uuid — ownership comes from its chat.
  await sql.unsafe('alter table messages enable row level security');
  await sql.unsafe('alter table messages force row level security');
  await sql.unsafe('drop policy if exists own_rows on messages');
  await sql.unsafe(`
    create policy own_rows on messages
    using (
      exists (
        select 1 from chats c
        where c.chat_uuid = messages.chat_uuid
          and c.user_uuid = current_setting('app.user_id', true)::uuid
      )
    )
    with check (
      exists (
        select 1 from chats c
        where c.chat_uuid = messages.chat_uuid
          and c.user_uuid = current_setting('app.user_id', true)::uuid
      )
    )
  `);
  console.log('  rls  messages (via chats)');

  console.log('\nrow-level security applied');
}

await main();
await sql.end();
process.exit(0);
