/**
 * Apply committed SQL migrations.
 *
 *   npm run db:generate   # schema.ts -> server/db/migrations/*.sql
 *   npm run db:migrate    # run the .sql files in order
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db, sql } from './client';

await migrate(db, { migrationsFolder: './server/db/migrations' });
console.log('migrations applied');

await sql.end();
process.exit(0);
