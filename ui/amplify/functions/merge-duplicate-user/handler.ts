import type { Schema } from "../../data/resource";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/merge-duplicate-user";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminUserGlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);

Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "merge-duplicate-user",
});

const cognitoClient = new CognitoIdentityProviderClient({});

export type MergeDuplicateUserPayload = {
  canonicalSub: string;
  secondarySub: string;
  /** Cognito Username (e.g. google_… or UUID), required for AdminDeleteUser */
  secondaryCognitoUsername: string;
  dryRun: boolean;
};

type Counts = Record<string, number>;

async function paginateEach<T>(
  list: (opts: {
    limit?: number;
    nextToken?: string;
  }) => Promise<{
    data?: (T | null)[] | null;
    nextToken?: string | null;
  }>,
  fn: (item: T) => Promise<void>
): Promise<number> {
  let nextToken: string | undefined;
  let n = 0;
  do {
    const res = await list({ limit: 100, nextToken });
    for (const item of res.data || []) {
      if (item) {
        await fn(item);
        n++;
      }
    }
    nextToken = res.nextToken || undefined;
  } while (nextToken);
  return n;
}

async function updateDocuments(
  from: string,
  to: string,
  dryRun: boolean,
  counts: Counts
): Promise<void> {
  await paginateEach(
    (opts) =>
      client.models.Document.listDocumentByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (doc) => {
      counts.documents = (counts.documents || 0) + 1;
      if (!dryRun && doc.documentUuid) {
        await client.models.Document.update({
          documentUuid: doc.documentUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateChats(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.Chat.listChatByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (chat) => {
      counts.chats = (counts.chats || 0) + 1;
      if (!dryRun && chat.chatUuid) {
        await client.models.Chat.update({
          chatUuid: chat.chatUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateSpaces(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) => client.models.Space.listSpaceByUserUuid({ userUuid: from }, opts),
    async (space) => {
      if (!space.spaceUuid) return;
      counts.spaces = (counts.spaces || 0) + 1;
      if (!dryRun) {
        await client.models.Space.update({
          spaceUuid: space.spaceUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateFlashcards(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.Flashcard.listFlashcardByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (fc) => {
      counts.flashcards = (counts.flashcards || 0) + 1;
      if (!dryRun && fc.flashcardUuid && fc.createdAt) {
        await client.models.Flashcard.update({
          flashcardUuid: fc.flashcardUuid,
          createdAt: fc.createdAt,
          userUuid: to,
        });
      }
    }
  );
}

async function updateFlashcardGames(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.FlashcardGame.listFlashcardGameByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (g) => {
      counts.flashcardGames = (counts.flashcardGames || 0) + 1;
      if (!dryRun && g.flashcardGameUuid) {
        await client.models.FlashcardGame.update({
          flashcardGameUuid: g.flashcardGameUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateQuizzes(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.Quiz.listQuizByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (q) => {
      counts.quizzes = (counts.quizzes || 0) + 1;
      if (!dryRun && q.quizUuid) {
        await client.models.Quiz.update({
          quizUuid: q.quizUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateMockExams(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.MockExam.listMockExamByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (m) => {
      counts.mockExams = (counts.mockExams || 0) + 1;
      if (!dryRun && m.mockExamUuid) {
        await client.models.MockExam.update({
          mockExamUuid: m.mockExamUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateExamPapers(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.ExamPaper.listExamPaperByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (e) => {
      counts.examPapers = (counts.examPapers || 0) + 1;
      if (!dryRun && e.examPaperUuid) {
        await client.models.ExamPaper.update({
          examPaperUuid: e.examPaperUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateTasks(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) => client.models.Task.listTaskByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (t) => {
      counts.tasks = (counts.tasks || 0) + 1;
      if (!dryRun && t.taskUuid) {
        await client.models.Task.update({
          taskUuid: t.taskUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function updateDatalabRequests(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.DatalabRequest.listDatalabRequestByUserUuidAndCreatedAt(
        { userUuid: from },
        opts
      ),
    async (d) => {
      counts.datalabRequests = (counts.datalabRequests || 0) + 1;
      if (!dryRun && d.requestId) {
        await client.models.DatalabRequest.update({
          requestId: d.requestId,
          userUuid: to,
        });
      }
    }
  );
}

async function updateSpaceUsers(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.SpaceUsers.listSpaceUsersByUserUuid({ userUuid: from }, opts),
    async (su) => {
      if (!su.spaceUsersUuid) return;
      counts.spaceUsers = (counts.spaceUsers || 0) + 1;
      if (!dryRun) {
        await client.models.SpaceUsers.update({
          spaceUsersUuid: su.spaceUsersUuid,
          userUuid: to,
        });
      }
    }
  );
}

async function migrateUserRequests(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.UserRequest.listUserRequestByUserUuidAndCreatedAt({ userUuid: from }, opts),
    async (row) => {
      counts.userRequests = (counts.userRequests || 0) + 1;
      if (dryRun || !row.createdAt) return;
      const createdAt = row.createdAt;
      const copy = {
        userUuid: to,
        model: row.model,
        retryCount: row.retryCount,
        promptTokenCount: row.promptTokenCount,
        cachedContentTokenCount: row.cachedContentTokenCount,
        candidatesTokenCount: row.candidatesTokenCount,
        thoughtsTokenCount: row.thoughtsTokenCount,
        toolUsePromptTokenCount: row.toolUsePromptTokenCount,
        totalTokenCount: row.totalTokenCount,
        image: row.image,
        requestStatus: row.requestStatus,
        webSearchCalled: row.webSearchCalled,
        latency: row.latency,
        xRequestId: row.xRequestId,
        xRateLimitLimitRequests: row.xRateLimitLimitRequests,
        xRateLimitLimitTokens: row.xRateLimitLimitTokens,
        xRateLimitRemainingRequests: row.xRateLimitRemainingRequests,
        xRateLimitRemainingTokens: row.xRateLimitRemainingTokens,
        xRateLimitResetRequests: row.xRateLimitResetRequests,
        xRateLimitResetTokens: row.xRateLimitResetTokens,
        category: row.category,
        feature: row.feature,
        documentUuid: row.documentUuid ?? undefined,
        youtubeVideoUuid: row.youtubeVideoUuid ?? undefined,
        createdAt,
        updatedAt: row.updatedAt,
      };
      await client.models.UserRequest.create(copy);
      try {
        await client.models.UserRequest.delete({ userUuid: from, createdAt });
      } catch (e) {
        logger.error(
          "UserRequest migrate: copy created on canonical but delete of secondary row failed — possible duplicate rows",
          { from, createdAt, error: String(e) }
        );
        throw e;
      }
    }
  );
}

async function migrateUserLearningProfileHistory(
  from: string,
  to: string,
  dryRun: boolean,
  counts: Counts
) {
  await paginateEach(
    (opts) =>
      client.models.UserLearningProfileHistory.listUserLearningProfileHistoryByUserUuidAndCreatedAt(
        { userUuid: from },
        opts
      ),
    async (row) => {
      counts.userLearningProfileHistory = (counts.userLearningProfileHistory || 0) + 1;
      if (dryRun || !row.userLearningProfileHistoryUuid) return;
      await client.models.UserLearningProfileHistory.update({
        userLearningProfileHistoryUuid: row.userLearningProfileHistoryUuid,
        userUuid: to,
      });
    }
  );
}

async function updateCurioSubscriptions(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({ userId: from }, opts),
    async (sub) => {
      counts.curioSubscriptions = (counts.curioSubscriptions || 0) + 1;
      if (!dryRun && sub.subscriptionId) {
        await client.models.CurioSubscription.update({
          subscriptionId: sub.subscriptionId,
          userId: to,
        });
      }
    }
  );
}

async function migratePurchases(from: string, to: string, dryRun: boolean, counts: Counts) {
  await paginateEach(
    (opts) =>
      client.models.Purchase.listPurchaseByUserIdAndPurchasedAt({ userId: from }, opts),
    async (p) => {
      counts.purchases = (counts.purchases || 0) + 1;
      if (dryRun || !p.bundleUuid) return;
      try {
        await client.models.Purchase.create({
          userId: to,
          bundleUuid: p.bundleUuid,
          purchasedAt: p.purchasedAt,
          source: p.source,
          receiptId: p.receiptId ?? undefined,
          revokedAt: p.revokedAt ?? undefined,
          revokedBy: p.revokedBy ?? undefined,
          revokeReason: p.revokeReason ?? undefined,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
        await client.models.Purchase.delete({ userId: from, bundleUuid: p.bundleUuid });
      } catch (e) {
        logger.warn("Purchase migrate skipped (likely duplicate bundle for canonical user)", {
          from,
          to,
          bundleUuid: p.bundleUuid,
          error: String(e),
        });
      }
    }
  );
}

async function mergeUserProfiles(
  canonicalSub: string,
  secondarySub: string,
  dryRun: boolean,
  counts: Counts
) {
  const [primary, secondary] = await Promise.all([
    client.models.UserProfile.get({ userUuid: canonicalSub }),
    client.models.UserProfile.get({ userUuid: secondarySub }),
  ]);

  if (!secondary.data) {
    return;
  }
  counts.userProfilesMerged = 1;

  if (dryRun) {
    return;
  }

  const p = primary.data;
  const s = secondary.data;
  const pickNewer = (a?: string | null, b?: string | null) => {
    if (!a) return b ?? undefined;
    if (!b) return a;
    return new Date(a) >= new Date(b) ? a : b;
  };

  // Canonical has no profile yet: copy secondary row onto canonical id, then drop secondary.
  if (!p) {
    await client.models.UserProfile.create({
      userUuid: canonicalSub,
      onboardingCompleted: s.onboardingCompleted,
      onboardingSkipped: s.onboardingSkipped,
      userEmail: s.userEmail ?? undefined,
      firstName: s.firstName ?? undefined,
      lastName: s.lastName ?? undefined,
      userDescription: s.userDescription ?? undefined,
      userHelp: s.userHelp ?? undefined,
      country: s.country ?? undefined,
      freeSATMockExamUuid: s.freeSATMockExamUuid ?? undefined,
      lastLoginAt: s.lastLoginAt ?? undefined,
    });
    await client.models.UserProfile.delete({ userUuid: secondarySub });
    return;
  }

  await client.models.UserProfile.update({
    userUuid: canonicalSub,
    onboardingCompleted: p.onboardingCompleted ?? s.onboardingCompleted,
    onboardingSkipped: p.onboardingSkipped ?? s.onboardingSkipped,
    userEmail: p.userEmail ?? s.userEmail,
    firstName: p.firstName ?? s.firstName,
    lastName: p.lastName ?? s.lastName,
    userDescription: p.userDescription ?? s.userDescription,
    userHelp: p.userHelp ?? s.userHelp,
    country: p.country ?? s.country,
    freeSATMockExamUuid: p.freeSATMockExamUuid ?? s.freeSATMockExamUuid,
    lastLoginAt: pickNewer(p.lastLoginAt, s.lastLoginAt),
  });

  await client.models.UserProfile.delete({ userUuid: secondarySub });
}

/**
 * Invalidate sessions and block sign-in for the secondary user before AppSync migration,
 * so the account cannot mutate data mid-merge. Best-effort: sign-out may fail if user was already removed.
 */
async function blockSecondaryCognitoAccess(secondaryCognitoUsername: string, dryRun: boolean) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    logger.warn("COGNITO_USER_POOL_ID not set; skipping blockSecondaryCognitoAccess");
    return;
  }
  if (dryRun) {
    logger.info("Dry run: would AdminUserGlobalSignOut + AdminDisableUser", {
      secondaryCognitoUsername,
    });
    return;
  }
  try {
    await cognitoClient.send(
      new AdminUserGlobalSignOutCommand({
        UserPoolId: userPoolId,
        Username: secondaryCognitoUsername,
      })
    );
  } catch (e) {
    logger.warn("AdminUserGlobalSignOut failed (continuing)", {
      secondaryCognitoUsername,
      error: String(e),
    });
  }
  await cognitoClient.send(
    new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: secondaryCognitoUsername,
    })
  );
}

async function deleteSecondaryCognitoUser(secondaryCognitoUsername: string, dryRun: boolean) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    logger.warn("COGNITO_USER_POOL_ID not set; skipping AdminDeleteUser");
    return;
  }
  if (dryRun) {
    logger.info("Dry run: would AdminDeleteUser", { secondaryCognitoUsername });
    return;
  }
  await cognitoClient.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: secondaryCognitoUsername,
    })
  );
}

const mergeHandler = async (event: MergeDuplicateUserPayload) => {
  const { canonicalSub, secondarySub, secondaryCognitoUsername, dryRun } = event;

  if (!canonicalSub || !secondarySub || !secondaryCognitoUsername) {
    throw new Error("canonicalSub, secondarySub, and secondaryCognitoUsername are required");
  }
  if (canonicalSub === secondarySub) {
    throw new Error("canonicalSub and secondarySub must differ");
  }

  const counts: Counts = {};

  logger.info("Starting merge", {
    canonicalSub,
    secondarySub,
    secondaryCognitoUsername,
    dryRun,
  });

  await blockSecondaryCognitoAccess(secondaryCognitoUsername, dryRun);

  await updateDocuments(secondarySub, canonicalSub, dryRun, counts);
  await updateChats(secondarySub, canonicalSub, dryRun, counts);
  await updateSpaces(secondarySub, canonicalSub, dryRun, counts);
  await updateFlashcards(secondarySub, canonicalSub, dryRun, counts);
  await updateFlashcardGames(secondarySub, canonicalSub, dryRun, counts);
  await updateQuizzes(secondarySub, canonicalSub, dryRun, counts);
  await updateMockExams(secondarySub, canonicalSub, dryRun, counts);
  await updateExamPapers(secondarySub, canonicalSub, dryRun, counts);
  await updateTasks(secondarySub, canonicalSub, dryRun, counts);
  await updateDatalabRequests(secondarySub, canonicalSub, dryRun, counts);
  await updateSpaceUsers(secondarySub, canonicalSub, dryRun, counts);
  await migrateUserRequests(secondarySub, canonicalSub, dryRun, counts);
  await migrateUserLearningProfileHistory(secondarySub, canonicalSub, dryRun, counts);
  await updateCurioSubscriptions(secondarySub, canonicalSub, dryRun, counts);
  await migratePurchases(secondarySub, canonicalSub, dryRun, counts);
  await mergeUserProfiles(canonicalSub, secondarySub, dryRun, counts);

  await deleteSecondaryCognitoUser(secondaryCognitoUsername, dryRun);

  return {
    success: true,
    dryRun,
    canonicalSub,
    secondarySub,
    counts,
    message: dryRun
      ? "Dry run complete (no writes)."
      : "Merge complete; secondary Cognito user removed.",
    neptuneNote:
      "Neptune graph is not updated by this Lambda. See docs/merge-duplicate-user-runbook.md for operator steps (separate graph job if you store userUuid in Neptune).",
  };
};

/** Lambda invoke / direct handler */
export const rawHandler = async (
  event: MergeDuplicateUserPayload | { body?: string }
): Promise<unknown> => {
  const payload: MergeDuplicateUserPayload =
    typeof (event as { body?: string }).body === "string"
      ? (JSON.parse((event as { body: string }).body) as MergeDuplicateUserPayload)
      : (event as MergeDuplicateUserPayload);
  return mergeHandler(payload);
};

export const handler = withSentryLambdaHandler(rawHandler);
