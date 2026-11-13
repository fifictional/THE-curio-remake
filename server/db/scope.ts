/**
 * Per-request database scope.
 *
 * RLS needs the current user id available to Postgres. We set it with
 * `set_config('app.user_id', <uuid>, true)` inside a transaction (`true` =
 * local to the transaction, so it cannot leak to another request).
 *
 * Every query in `postgres-data.ts` runs through `asUser`, which means the
 * database itself enforces ownership — not a route, not a guard, not a
 * remembered `where user_uuid = ...`.
 */

import { drizzle } from 'drizzle-orm/postgres-js';

import { sql } from './client';
import * as schema from './schema';

export type Executor = ReturnType<typeof drizzle<typeof schema>>;

export async function asUser<T>(
  userId: string | null,
  fn: (db: Executor) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    // An unauthenticated request gets an empty string, which casts to null in
    // the policy comparison — so it sees no rows rather than everything.
    await tx`select set_config('app.user_id', ${userId ?? ''}, true)`;
    const db = drizzle(tx as never, { schema });
    return fn(db as Executor);
  }) as Promise<T>;
}
