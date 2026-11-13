import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env as mutatorEnv } from "$amplify/env/batch-mutator";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, SpaceFlashcardEmbedJob } from "./interface";
import { embedFlashcardsForSpace } from "../../../../utils/embed-space-flashcards";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);
Amplify.configure(resourceConfig, libraryOptions);
const mutatorClient = generateClient<Schema>();

registerMutator({
  jobType: JOB_NAME,
  processJob: async (
    job: SpaceFlashcardEmbedJob,
    log: (message: string) => void
  ): Promise<void> => {
    const { spaceUuid, userUuid } = job;
    log(`Embedding flashcards for space ${spaceUuid}`);
    const { embedded } = await embedFlashcardsForSpace(
      mutatorClient,
      spaceUuid,
      userUuid
    );
    if (embedded === 0) {
      log(`No flashcards found for space ${spaceUuid}, skipping`);
    } else {
      log(`Done embedding ${embedded} flashcards for space ${spaceUuid}`);
    }
  },
});
