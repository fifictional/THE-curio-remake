#!/usr/bin/env node
/**
 * Give an imported user a password so they can log in locally.
 *
 *   node scripts/adopt-user.mjs --email aditya@curio.to --password localpass123
 *   node scripts/adopt-user.mjs --list          # users with the most data
 *
 * Why this exists: the migration copies `users` rows from DynamoDB, but those
 * users authenticated against **Cognito**, whose password hashes Better Auth
 * cannot verify. Until the product decides between "force a reset" and a
 * Cognito bridge, this attaches a Better Auth credential to one existing user so
 * the migrated data can be exercised.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { hashPassword } from 'better-auth/crypto';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : fallback;
};

const DATABASE_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';
const sql = postgres(DATABASE_URL, { max: 2 });

async function list() {
  const rows = await sql.unsafe(`
    select u.user_uuid as id, u.email,
           (select count(*) from chats c where c.user_uuid = u.user_uuid) as chats,
           (select count(*) from documents d where d.user_uuid = u.user_uuid) as documents,
           (a.password is not null) as can_login
    from users u
    left join accounts a on a.user_id = u.user_uuid and a.provider_id = 'credential'
    order by chats desc, documents desc
    limit 15
  `);
  console.table(rows);
  await sql.end();
}

async function adopt(email, password) {
  if (!email || !password) {
    console.error('usage: adopt-user.mjs --email <email> --password <password>');
    process.exit(1);
  }

  const [user] = await sql.unsafe('select user_uuid as id, email from users where email = $1', [email]);
  if (!user) {
    console.error(`no imported user with email ${email} — try --list`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const [existing] = await sql.unsafe(
    `select id from accounts where user_id = $1 and provider_id = 'credential'`,
    [user.id],
  );

  if (existing) {
    await sql.unsafe('update accounts set password = $1, updated_at = now() where id = $2', [
      hash,
      existing.id,
    ]);
    console.log(`updated password for ${email}`);
  } else {
    await sql.unsafe(
      `insert into accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
       values ($1, $2, 'credential', $3, $4, now(), now())`,
      [crypto.randomUUID(), user.id, user.id, hash],
    );
    console.log(`created a credential account for ${email}`);
  }

  await sql.end();
}

if (argv.includes('--list')) await list();
else await adopt(arg('email'), arg('password'));
