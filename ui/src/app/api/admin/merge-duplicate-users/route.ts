import { NextRequest, NextResponse } from "next/server";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";
import { getUserId } from "@/lib/ssr/utils";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import type { Schema } from "@amplify/data/resource";
import {
  pickCanonicalForDuplicateMerge,
  type SlimAccount,
} from "@/lib/admin/merge-duplicate/pick-canonical";
import awsExports from "../../../../../amplify_outputs.json";

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || awsExports.auth?.aws_region || "us-east-1",
});

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getUserGroups(): Promise<string[] | null> {
  try {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      const name = cookie.name.toLowerCase();
      const value = cookie.value;
      if (
        (name.includes("idtoken") || name.includes("id_token")) &&
        value?.includes(".")
      ) {
        const decoded = decodeJWT(value);
        const g = decoded?.["cognito:groups"];
        if (Array.isArray(g)) return g as string[];
      }
    }
    for (const cookie of cookieStore.getAll()) {
      const name = cookie.name.toLowerCase();
      const value = cookie.value;
      if (
        (name.includes("accesstoken") ||
          name.includes("access_token") ||
          name.includes("cognitoidentityserviceprovider") ||
          name.includes("amplify-auth") ||
          name.includes("amplify-signin-with-hostedui")) &&
        value?.includes(".")
      ) {
        const decoded = decodeJWT(value);
        const g = decoded?.["cognito:groups"];
        if (Array.isArray(g)) return g as string[];
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Destructive admin action: require Cognito `admin` group — no userId-only bypass. */
async function requireAdminGroup(): Promise<boolean> {
  let groups = await getUserGroups();
  if (!groups?.includes("admin")) {
    const userId = await getUserId();
    const poolId = awsExports.auth?.user_pool_id;
    if (userId && poolId) {
      try {
        const region = awsExports.auth?.aws_region || process.env.AWS_REGION || "us-east-1";
        const cognitoClient = new CognitoIdentityProviderClient({ region });
        const response = await cognitoClient.send(
          new AdminListGroupsForUserCommand({
            UserPoolId: poolId,
            Username: userId,
          })
        );
        groups = response.Groups?.map((g) => g.GroupName || "") || [];
      } catch (e) {
        console.error("[merge-duplicate-users] Cognito groups lookup failed", e);
      }
    }
  }
  return !!groups?.includes("admin");
}

type DupPayload = {
  duplicateEmails: Array<{
    email: string;
    count?: number;
    accounts: SlimAccount[];
  }>;
};

export async function POST(request: NextRequest) {
  const isAdmin = await requireAdminGroup();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized: Admin access required" },
      { status: 403 }
    );
  }

  const custom = (awsExports.custom || {}) as Record<string, unknown>;
  const functionName = custom.mergeDuplicateUserFunctionName as string | undefined;
  if (!functionName) {
    return NextResponse.json(
      {
        error:
          "mergeDuplicateUserFunctionName missing from amplify_outputs.json — deploy backend and refresh outputs",
      },
      { status: 500 }
    );
  }

  let body: DupPayload & { dryRun?: boolean; limit?: number };
  try {
    body = (await request.json()) as DupPayload & { dryRun?: boolean; limit?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { duplicateEmails, dryRun = true, limit } = body;
  if (!duplicateEmails || !Array.isArray(duplicateEmails)) {
    return NextResponse.json(
      { error: "Body must include duplicateEmails: [...]" },
      { status: 400 }
    );
  }

  Amplify.configure(awsExports);
  const dataClient = generateClient<Schema>({ authMode: "apiKey" });

  type MergeResult = {
    canonicalSub: string;
    secondarySub: string;
    ok: boolean;
    lambdaPayload?: unknown;
    error?: string;
  };

  const groupResults: Array<{
    email: string;
    merges: MergeResult[];
    skipped?: string;
  }> = [];

  let processedGroups = 0;
  for (const group of duplicateEmails) {
    if (limit !== undefined && processedGroups >= limit) break;

    const { email, accounts } = group;
    if (!accounts?.length || accounts.length < 2) {
      groupResults.push({
        email: email || "(missing email)",
        merges: [],
        skipped: "Need 2+ accounts in group",
      });
      continue;
    }

    const { canonical, secondaries } = await pickCanonicalForDuplicateMerge(
      dataClient,
      accounts
    );
    const merges: MergeResult[] = [];

    for (const secondary of secondaries) {
      const payload = {
        canonicalSub: canonical.sub,
        secondarySub: secondary.sub,
        secondaryCognitoUsername: secondary.Username,
        dryRun,
      };

      try {
        const res = await lambdaClient.send(
          new InvokeCommand({
            FunctionName: functionName,
            Payload: Buffer.from(JSON.stringify(payload)),
          })
        );
        const raw = res.Payload ? Buffer.from(res.Payload).toString("utf8") : "";
        if (res.FunctionError) {
          merges.push({
            canonicalSub: canonical.sub,
            secondarySub: secondary.sub,
            ok: false,
            error: raw || res.FunctionError,
          });
          continue;
        }
        let parsed: unknown = raw;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = { raw };
        }
        merges.push({
          canonicalSub: canonical.sub,
          secondarySub: secondary.sub,
          ok: true,
          lambdaPayload: parsed,
        });
      } catch (e) {
        merges.push({
          canonicalSub: canonical.sub,
          secondarySub: secondary.sub,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    groupResults.push({ email, merges });
    processedGroups++;
  }

  return NextResponse.json({
    success: true,
    dryRun,
    groupsProcessed: processedGroups,
    results: groupResults,
  });
}
