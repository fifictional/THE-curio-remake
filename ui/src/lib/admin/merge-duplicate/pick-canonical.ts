import type { Schema } from "@amplify/data/resource";
import { generateClient } from "aws-amplify/api";

/** Cognito-export slim row used by duplicate-email JSON and merge tooling */
export type SlimAccount = {
  Username: string;
  sub: string;
  UserStatus?: string | null;
  email_verified?: string | null;
  UserCreateDate?: string | null;
};

function parseIso(s?: string | null): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Chooses the canonical account (kept): highest UserProfile.lastLoginAt; ties fall through to first sort order.
 */
export async function pickCanonicalForDuplicateMerge(
  client: ReturnType<typeof generateClient<Schema>>,
  accounts: SlimAccount[]
): Promise<{ canonical: SlimAccount; secondaries: SlimAccount[] }> {
  const withProfile = await Promise.all(
    accounts.map(async (a) => {
      const res = await client.models.UserProfile.get({ userUuid: a.sub });
      return { account: a, lastLoginAt: res.data?.lastLoginAt ?? null };
    })
  );
  withProfile.sort((x, y) => parseIso(y.lastLoginAt) - parseIso(x.lastLoginAt));
  const canonical = withProfile[0]!.account;
  const secondaries = withProfile.slice(1).map((w) => w.account);
  return { canonical, secondaries };
}
