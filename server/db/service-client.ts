/**
 * Service connection — used ONLY by background work that acts for no single
 * request: the polling worker and the retrieval indexer.
 *
 * In production this is `curio_service` (`LOGIN BYPASSRLS`, owns nothing), a role
 * distinct from both the migration owner and the app. Locally it falls back to
 * the owner URL, because the docker owner is a superuser and therefore bypasses
 * RLS anyway.
 *
 * Why a bypass at all: `FORCE ROW LEVEL SECURITY` applies to the table owner too
 * unless it is a superuser, so on managed Postgres (where the owner is not) the
 * worker's writes would be rejected by policies that expect `app.user_id`.
 * A dedicated, auditable BYPASSRLS role is the alternative to leaking the
 * migration credential into the runtime.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const url =
  process.env.DATABASE_URL_SERVICE ??
  process.env.DATABASE_URL_OWNER ??
  'postgres://curio:curio@localhost:5433/curio';

export const serviceSql = postgres(url, { max: 5 });
export const serviceDb = drizzle(serviceSql, { schema });
