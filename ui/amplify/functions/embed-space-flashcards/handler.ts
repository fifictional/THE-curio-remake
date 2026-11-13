import type { Schema } from "@database-schema";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/embed-space-flashcards";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { embedFlashcardsForSpace } from "../../utils/embed-space-flashcards";
import { withSentryLambdaHandler } from "../common/sentry-lambda";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

export interface EmbedSpaceFlashcardsEvent {
  arguments?: { spaceUuid?: string; userUuid?: string };
  spaceUuid?: string;
  userUuid?: string;
}

const embedSpaceFlashcardsHandler = async (
  event: EmbedSpaceFlashcardsEvent
): Promise<{ success: boolean; embedded?: number; error?: string }> => {
  const spaceUuid = event.arguments?.spaceUuid ?? event.spaceUuid;
  const userUuid = event.arguments?.userUuid ?? event.userUuid;
  if (!spaceUuid || !userUuid) {
    return { success: false, error: "spaceUuid and userUuid required" };
  }
  try {
    const { embedded } = await embedFlashcardsForSpace(
      client,
      spaceUuid,
      userUuid
    );
    return { success: true, embedded };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[embed-space-flashcards] Error:", msg);
    return { success: false, error: msg };
  }
};

export const handler = withSentryLambdaHandler(embedSpaceFlashcardsHandler);
