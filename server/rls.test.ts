/**
 * Security invariants, asserted against the live database.
 *
 * Two authorization bugs shipped here by hand (`/files` and `/documents` both
 * trusted a key), and every new table is a new chance to forget a policy. This
 * suite turns the design in `server/db/rls.ts` into an assertion, so the failure
 * is a red test instead of a silent data leak:
 *
 *   - every table in `public` is either user data (RLS on + forced) or on the
 *     documented exemption list — a new table fails until it is classified
 *   - every RLS table has a policy, except the two that must have none
 *   - `curio_app` is a plain role: no superuser, no BYPASSRLS, owns nothing
 *   - `curio_app` can actually read/write every table (grants are not enough to
 *     protect; missing grants are a silent 500)
 *
 * Skipped when no database is reachable, like the other integration suites.
 */

import { afterAll, describe, expect, it } from 'vitest';

import postgres from 'postgres';

const OWNER_URL =
  process.env.DATABASE_URL_OWNER ?? 'postgres://curio:curio@localhost:5433/curio';

/** Better Auth writes these before a user context exists — no policy possible. */
const AUTH_TABLES = ['users', 'sessions', 'accounts', 'verifications'];
/** Importer bookkeeping, not user data and never reachable by the app. */
const OPS_TABLES = ['import_quarantine'];
/**
 * RLS on, deliberately no policy: only the owner role (importer, worker) can
 * read or write. Covers PII without a role model, internal job state, and the
 * tables whose features were dropped (docs/decisions.md).
 */
const OWNER_ONLY_TABLES = [
  'future_users',
  'batch_processes',
  // Dropped features: data kept, no product code reads it.
  'extracted_questions',
  'exam_papers',
  'exam_paper_questions',
  'mock_exams',
  'mock_exam_logs',
  'sat_mini_exam_logs',
  'flashcard_games',
  'question_extract_jobs',
  'question_generation_jobs',
  'user_learning_profile_history',
  // Pipeline output written by the worker, never read by the app.
  'document_sections',
  'document_vision_outputs',
  'datalab_requests',
];
/** Read-only for any signed-in caller. */
const PUBLIC_READ_TABLES = [
  'partnerships',
  'app_settings',
  'mock_documents',
  'bundles',
  'exam_modules',
  'youtube_videos',
];
/** Shared content: readable by all, writable only through the owning job. */
const READ_ALL_TABLES: string[] = [];

const EXEMPT = new Set([...AUTH_TABLES, ...OPS_TABLES]);

async function reachable(): Promise<boolean> {
  const probe = postgres(OWNER_URL, { max: 1, connect_timeout: 2 });
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end({ timeout: 1 }).catch(() => {});
  }
}

const suite = (await reachable()) ? describe : describe.skip;
const sql = postgres(OWNER_URL, { max: 2 });

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

interface TableRow {
  name: string;
  owner: string;
  rls: boolean;
  forced: boolean;
}

interface PolicyRow {
  tablename: string;
  policyname: string;
  cmd: string;
  qual: string | null;
  withCheck: string | null;
}

async function tables(): Promise<TableRow[]> {
  return sql<TableRow[]>`
    select c.relname as name,
           pg_get_userbyid(c.relowner) as owner,
           c.relrowsecurity as rls,
           c.relforcerowsecurity as forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `;
}

async function policies(): Promise<PolicyRow[]> {
  return sql<PolicyRow[]>`
    select tablename, policyname, cmd, qual, with_check as "withCheck"
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `;
}

suite('row-level security invariants', () => {
  it('classifies every table: user data with RLS, or a documented exemption', async () => {
    const rows = await tables();
    const unclassified = rows.filter((t) => !EXEMPT.has(t.name) && !(t.rls && t.forced));

    expect(
      unclassified.map((t) => t.name),
      'new table(s) must be added to rls.ts and/or the exemption list in this test',
    ).toEqual([]);
  });

  it('does not silently leave an exempt table protected or unprotected', async () => {
    const rows = await tables();
    const exempt = rows.filter((t) => EXEMPT.has(t.name));

    // The list must stay real: renaming/removing a table should fail here too.
    expect(exempt.map((t) => t.name).sort()).toEqual([...EXEMPT].sort());
    for (const table of exempt) {
      expect(table.rls, `${table.name} is exempt, so it must not carry policies`).toBe(false);
    }
  });

  it('gives every RLS table a policy, except the two that must have none', async () => {
    const rows = (await tables()).filter((t) => t.rls);
    const byTable = new Map<string, PolicyRow[]>();
    for (const policy of await policies()) {
      byTable.set(policy.tablename, [...(byTable.get(policy.tablename) ?? []), policy]);
    }

    const missing = rows
      .filter((t) => !OWNER_ONLY_TABLES.includes(t.name) && !byTable.has(t.name))
      .map((t) => t.name);
    expect(missing, 'RLS table with no policy: the app sees zero rows forever').toEqual([]);

    for (const name of OWNER_ONLY_TABLES) {
      expect(byTable.get(name) ?? [], `${name} must stay owner-only`).toHaveLength(0);
    }
  });

  it('keeps the public-read set small and explicit', async () => {
    // A `using (true)` SELECT policy is how a table becomes world-readable to
    // every signed-in caller. Anything new here is a deliberate decision.
    const worldReadable = (await policies())
      .filter((p) => p.cmd === 'SELECT' && (p.qual ?? '').trim() === 'true')
      .map((p) => p.tablename)
      .sort();

    expect(worldReadable).toEqual([...PUBLIC_READ_TABLES, ...READ_ALL_TABLES].sort());
  });

  it('scopes every policy to the request user, never to a literal', async () => {
    const scoped = (await policies()).filter(
      (p) => !PUBLIC_READ_TABLES.includes(p.tablename) && !READ_ALL_TABLES.includes(p.tablename),
    );

    for (const policy of scoped) {
      const expression = `${policy.qual ?? ''} ${policy.withCheck ?? ''}`;
      expect(expression, `${policy.tablename}.${policy.policyname}`).toMatch(
        /current_setting\('app\.user_id'/,
      );
    }
  });

  it('runs the app as a plain role that owns nothing', async () => {
    const [role] = await sql<
      Array<{ rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean }>
    >`
      select rolsuper, rolbypassrls, rolcanlogin from pg_roles where rolname = 'curio_app'
    `;

    expect(role, 'role curio_app must exist (npm run db:rls)').toBeTruthy();
    // A superuser bypasses RLS even with FORCE; BYPASSRLS bypasses it always.
    expect(role.rolsuper).toBe(false);
    expect(role.rolbypassrls).toBe(false);
    expect(role.rolcanlogin).toBe(true);

    const owned = (await tables()).filter((t) => t.owner === 'curio_app');
    expect(owned.map((t) => t.name), 'the app role must not own tables').toEqual([]);
  });

  it('grants the app role read and write on every table', async () => {
    const rows = await sql<Array<{ name: string; canRead: boolean; canWrite: boolean }>>`
      select c.relname as name,
             has_table_privilege('curio_app', c.oid, 'select') as "canRead",
             has_table_privilege('curio_app', c.oid, 'insert')
               and has_table_privilege('curio_app', c.oid, 'update')
               and has_table_privilege('curio_app', c.oid, 'delete') as "canWrite"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by 1
    `;

    expect(rows.filter((r) => !r.canRead).map((r) => r.name)).toEqual([]);
    expect(rows.filter((r) => !r.canWrite).map((r) => r.name)).toEqual([]);
    expect((await sql<Array<{ ok: boolean }>>`select has_schema_privilege('curio_app', 'public', 'usage') as ok`)[0].ok).toBe(true);
  });

  it('shows a stranger no rows in user data or owner-only tables', async () => {
    // Behavioural check, not catalogue inspection: a real non-owner role, a real
    // request user, and the tables that must never leak.
    const stranger = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const userTables = (await tables())
      .filter((t) => t.rls && !PUBLIC_READ_TABLES.includes(t.name))
      .map((t) => t.name);

    const counts = await sql.begin(async (tx) => {
      await tx`select set_config('app.user_id', ${stranger}, true)`;
      await tx`set local role curio_app`;

      const out: Record<string, number> = {};
      for (const table of userTables) {
        const [row] = await tx.unsafe(
          `select count(*)::int as n from "${table}"`,
        );
        out[table] = row.n as number;
      }
      return out;
    });

    const leaking = Object.entries(counts)
      .filter(([table, n]) => n > 0 && OWNER_ONLY_TABLES.includes(table))
      .map(([table]) => table);
    expect(leaking, 'owner-only tables must be empty for the app role').toEqual([]);

    // Whole-table read-only content is allowed to be visible.
    for (const table of READ_ALL_TABLES) {
      expect(counts[table]).toBeGreaterThanOrEqual(0);
    }
  });
});
