/**
 * Database client (singleton).
 *
 * `postgres` (postgres.js) is used as the driver and Drizzle on top of it.
 * One pool per process; imported by `postgres-data.ts` and the seed script.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'postgres://curio:curio@localhost:5433/curio';

export const sql = postgres(url, { max: 10 });
export const db = drizzle(sql, { schema });

export type Db = typeof db;
