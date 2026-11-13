import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env as creatorEnv } from "$amplify/env/hono-heavy";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { registerCreator } from "../../../../common/batch-processing";
import { JOB_NAME, SpaceFlashcardEmbedJob } from "./interface";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);
Amplify.configure(resourceConfig, libraryOptions);
const creatorClient = generateClient<Schema>();

registerCreator({
  name: "Space Flashcard Embed",
  jobType: JOB_NAME,
  description:
    "Embed flashcard content (front + back) from space documents and chats into OpenSearch for RAG",
  createJobs: async (emit, log) => {
    const spacesSeen = new Set<string>();
    let queued = 0;

    // Documents with flashcardDeckUuid in a space
    log("Listing documents with flashcard decks...");
    let docToken: string | undefined;
    do {
      const docRes = await creatorClient.models.Document.list({
        limit: 200,
        nextToken: docToken,
        filter: {
          and: [
            { spaceUuid: { attributeExists: true } },
            { flashcardDeckUuid: { attributeExists: true } },
          ],
        },
        selectionSet: ["spaceUuid", "userUuid"],
      });

      for (const doc of docRes.data || []) {
        if (doc.spaceUuid && doc.userUuid && !spacesSeen.has(doc.spaceUuid)) {
          spacesSeen.add(doc.spaceUuid);
          await emit({
            spaceUuid: doc.spaceUuid,
            userUuid: doc.userUuid,
          } as SpaceFlashcardEmbedJob);
          queued++;
        }
      }
      docToken = docRes.nextToken ?? undefined;
    } while (docToken);

    // Chats with flashcardDeckUuid in a space
    log("Listing chats with flashcard decks...");
    let chatToken: string | undefined;
    do {
      const chatRes = await creatorClient.models.Chat.list({
        limit: 200,
        nextToken: chatToken,
        filter: {
          and: [
            { spaceUuid: { attributeExists: true } },
            { flashcardDeckUuid: { attributeExists: true } },
          ],
        },
        selectionSet: ["spaceUuid", "userUuid"],
      });

      for (const chat of chatRes.data || []) {
        if (chat.spaceUuid && chat.userUuid && !spacesSeen.has(chat.spaceUuid)) {
          spacesSeen.add(chat.spaceUuid);
          await emit({
            spaceUuid: chat.spaceUuid,
            userUuid: chat.userUuid,
          } as SpaceFlashcardEmbedJob);
          queued++;
        }
      }
      chatToken = chatRes.nextToken ?? undefined;
    } while (chatToken);

    log(`Queued ${queued} spaces for flashcard embedding`);
  },
});
