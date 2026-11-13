/**
 * Apply committed SQL migrations.
 *
 *   npm run db:generate   # schema.ts -> server/db/migrations/*.sql
 *   npm run db:migrate    # run the .sql files in order
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { ownerDb, ownerSql } from './owner-client';

await migrate(ownerDb, { migrationsFolder: './server/db/migrations' });
console.log('migrations applied');

await ownerSql.end();
process.exit(0);
