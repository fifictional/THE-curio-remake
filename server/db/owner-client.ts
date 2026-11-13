/**
 * Owner connection — used ONLY by scripts (migrations, RLS setup, seed).
 *
 * The app itself connects with a limited role (`curio_app`) that cannot bypass
 * RLS. The owner is a superuser, and superusers ignore row-level security even
 * with FORCE ROW LEVEL SECURITY — which is exactly why roles are split.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const url =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';

export const ownerSql = postgres(url, { max: 5 });
export const ownerDb = drizzle(ownerSql, { schema });
