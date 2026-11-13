import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env as creatorEnv } from "$amplify/env/hono-heavy";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, ChatSummaryEmbedJob } from "./interface";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);
Amplify.configure(resourceConfig, libraryOptions);
const creatorClient = generateClient<Schema>();

registerCreator({
  name: "Chat Summary Embed",
  jobType: JOB_NAME,
  description:
    "Summarise chat messages older than 24h and embed into OpenSearch for space RAG",
  createJobs: async (emit, log) => {
    let queued = 0;

    // List Space rows directly — Chat.list + attributeExists filter is unreliable on
    // full-table scans and misses spaces whose chats were created without spaceUuid.
    log("Listing Space table...");
    let spaceToken: string | undefined;
    do {
      const spaceRes = await creatorClient.models.Space.list({
        limit: 500,
        nextToken: spaceToken,
        selectionSet: ["spaceUuid", "userUuid"],
      });

      for (const space of spaceRes.data || []) {
        if (!space.spaceUuid || !space.userUuid) continue;
        await emit({
          spaceUuid: space.spaceUuid,
          userUuid: space.userUuid,
        } as ChatSummaryEmbedJob);
        queued++;
      }
      spaceToken = spaceRes.nextToken ?? undefined;
    } while (spaceToken);

    log(`Queued ${queued} spaces for chat summary embedding`);
  },
});
