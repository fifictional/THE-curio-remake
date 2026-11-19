#!/usr/bin/env node
/**
 * Operator CLI — the admin surface, without a UI or a role model.
 *
 * The old app had 38 `/admin` pages behind a Cognito group. There is no role
 * model in the new stack, so ops work happens here instead: read-only queries
 * over the owner connection, no browser, no PII in a page.
 *
 *   node scripts/ops.mjs stats
 *   node scripts/ops.mjs users search ada
 *   node scripts/ops.mjs users show test@curio.to
 *   node scripts/ops.mjs chat <chatUuid>
 *   node scripts/ops.mjs tasks
 *   node scripts/ops.mjs quarantine
 *   node scripts/ops.mjs memory test@curio.to
 *
 * `--json` prints the raw rows for scripting.
 */

import 'dotenv/config';
import postgres from 'postgres';

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const args = argv.filter((arg) => arg !== '--json');
const [command, sub, ...rest] = args;

const DATABASE_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';
const sql = postgres(DATABASE_URL, { max: 2 });

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const print = (rows) => {
  if (!rows.length) {
    console.log('(no rows)');
    return;
  }
  console.table(rows);
};

async function stats() {
  const rows = await sql`
    select 'users' as name, count(*)::int from users
    union all select 'documents', count(*) from documents
    union all select 'document_summaries', count(*) from document_summaries
    union all select 'document_chunks', count(*) from document_chunks
    union all select 'spaces', count(*) from spaces
    union all select 'chats', count(*) from chats
    union all select 'messages', count(*) from messages
    union all select 'flashcards', count(*) from flashcards
    union all select 'quizzes', count(*) from quizzes
    union all select 'tasks', count(*) from tasks
    union all select 'memory_blocks', count(*) from memory_blocks
    union all select 'purchases', count(*) from purchases
    union all select 'subscriptions', count(*) from curio_subscriptions
    union all select 'quarantined', count(*) from import_quarantine
    order by name`;

  const [sizes] = await sql`
    select pg_size_pretty(pg_database_size(current_database())) as database,
           pg_size_pretty(sum(pg_total_relation_size(relid))) as tables
    from pg_catalog.pg_statio_user_tables`;

  if (JSON_OUT) return console.log(JSON.stringify({ tables: rows, sizes }, null, 2));
  print(rows);
  print([sizes]);
}

async function users(action, term) {
  if (action === 'search') {
    if (!term) fail('usage: ops users search <email-or-name>');
    const rows = await sql`
      select user_uuid as id, email, name, onboarding_completed, memory_disabled, created_at::date
      from users
      where email ilike ${'%' + term + '%'} or name ilike ${'%' + term + '%'}
      order by created_at desc limit 20`;
    return JSON_OUT ? console.log(JSON.stringify(rows, null, 2)) : print(rows);
  }

  if (action === 'show') {
    if (!term) fail('usage: ops users show <email>');
    const [user] = await sql`select * from users where email = ${term} limit 1`;
    if (!user) fail(`no user with email ${term}`);
    const [counts] = await sql`
      select
        (select count(*) from documents where user_uuid = ${user.user_uuid})::int as documents,
        (select count(*) from chats where user_uuid = ${user.user_uuid})::int as chats,
        (select count(*) from messages where user_uuid = ${user.user_uuid})::int as messages,
        (select count(*) from flashcards where user_uuid = ${user.user_uuid})::int as flashcards,
        (select count(*) from memory_blocks where owner_uuid = ${user.user_uuid})::int as memory_blocks,
        (select count(*) from curio_subscriptions where user_id = ${user.user_uuid} and status = 'active')::int as active_subs`;
    return JSON_OUT
      ? console.log(JSON.stringify({ user, counts }, null, 2))
      : (print([{ ...user }]), print([counts]));
  }

  fail('usage: ops users search <term> | users show <email>');
}

async function chat(chatUuid) {
  if (!chatUuid) fail('usage: ops chat <chatUuid>');
  const [row] = await sql`
    select c.chat_uuid, c.name, u.email, c.created_at::date
    from chats c left join users u on u.user_uuid = c.user_uuid
    where c.chat_uuid = ${chatUuid}`;
  if (!row) fail(`no chat ${chatUuid}`);
  const messages = await sql`
    select created_at::timestamp(0), role, type, left(content, 160) as content
    from messages where chat_uuid = ${chatUuid} order by created_at`;
  return JSON_OUT ? console.log(JSON.stringify({ chat: row, messages }, null, 2)) : (print([row]), print(messages));
}

async function tasks() {
  const rows = await sql`select status, type, count(*)::int from tasks group by 1,2 order by 3 desc`;
  return JSON_OUT ? console.log(JSON.stringify(rows, null, 2)) : print(rows);
}

async function quarantine() {
  const rows = await sql`
    select source_table, count(*)::int as rows, min(reason) as example
    from import_quarantine group by 1 order by 2 desc`;
  return JSON_OUT ? console.log(JSON.stringify(rows, null, 2)) : print(rows);
}

async function memory(email) {
  if (!email) fail('usage: ops memory <email>');
  const rows = await sql`
    select m.block_type, m.scope, m.topic, m.subject, m.updated_at::date
    from memory_blocks m join users u on u.user_uuid = m.owner_uuid
    where u.email = ${email} order by m.updated_at desc`;
  return JSON_OUT ? console.log(JSON.stringify(rows, null, 2)) : print(rows);
}

try {
  if (command === 'stats') await stats();
  else if (command === 'users') await users(sub, rest[0]);
  else if (command === 'chat') await chat(sub);
  else if (command === 'tasks') await tasks();
  else if (command === 'quarantine') await quarantine();
  else if (command === 'memory') await memory(sub);
  else {
    console.log(`curio ops

  ops stats                 row counts + database size
  ops users search <term>   find users by email or name
  ops users show <email>    profile, counts, active subscriptions
  ops chat <uuid>           a conversation and its messages
  ops tasks                 pipeline task states
  ops quarantine            rows the importer could not load
  ops memory <email>        what Curio remembers about one user

  --json                    machine-readable output`);
  }
} finally {
  await sql.end();
}
