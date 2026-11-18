/**
 * Per-request database scope.
 *
 * RLS needs the current user id available to Postgres. We set it with
 * `set_config('app.user_id', <uuid>, true)` inside a Drizzle transaction
 * (`true` = local to the transaction, so it cannot leak between requests).
 *
 * Every query in `postgres-data.ts` runs through `asUser`, which means the
 * database itself enforces ownership — not a route, not a guard, not a
 * remembered `where user_uuid = ...`.
 */

import { sql as drizzleSql } from 'drizzle-orm';

import { db as baseDb } from './client';
import * as schema from './schema';

export type Executor = typeof baseDb;

export async function asUser<T>(
  userId: string | null,
  fn: (db: Executor) => Promise<T>,
): Promise<T> {
  return baseDb.transaction(async (tx) => {
    // An unauthenticated request gets an empty string: the cast to uuid yields
    // NULL in the policy comparison, so it matches no rows.
    await tx.execute(drizzleSql`select set_config('app.user_id', ${userId ?? ''}, true)`);
    return fn(tx as unknown as Executor);
  });
}

export { schema };
