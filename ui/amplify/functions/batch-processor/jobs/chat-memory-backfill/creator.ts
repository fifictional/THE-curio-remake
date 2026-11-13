import type { Schema } from '../../../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env as creatorEnv } from '$amplify/env/hono-heavy';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { registerCreator } from '../../../../common/batch-processing';
import {
  isChatBackfillComplete,
} from '@ai-memory/index';
import { JOB_NAME, ChatMemoryBackfillJob } from './interface';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  creatorEnv as any
);

Amplify.configure(resourceConfig, libraryOptions);
const creatorClient = generateClient<Schema>();

registerCreator({
  name: 'Chat Memory Backfill',
  jobType: JOB_NAME,
  description:
    'Replay historical chat turns through the memory reflection agent to build knowledge gaps and mastered topics',
  createJobs: async (emit, log) => {
    let chatsQueued = 0;
    let chatsSkipped = 0;
    let usersScanned = 0;

    log('Scanning UserProfile table for users...');
    let profileToken: string | undefined;
    do {
      const profileRes = await creatorClient.models.UserProfile.list({
        limit: 500,
        nextToken: profileToken,
        selectionSet: ['userUuid'],
      });

      for (const profile of profileRes.data ?? []) {
        if (!profile.userUuid) continue;
        usersScanned += 1;

        let chatToken: string | undefined;
        do {
          const chatRes =
            await creatorClient.models.Chat.listChatByUserUuidAndCreatedAt(
              { userUuid: profile.userUuid },
              { limit: 200, nextToken: chatToken, sortDirection: 'ASC' }
            );

          for (const chat of chatRes.data ?? []) {
            if (!chat.chatUuid) continue;

            if (await isChatBackfillComplete(creatorClient, chat.chatUuid)) {
              chatsSkipped += 1;
              continue;
            }

            await emit({
              userUuid: profile.userUuid,
              chatUuid: chat.chatUuid,
            } satisfies ChatMemoryBackfillJob);
            chatsQueued += 1;
          }

          chatToken = chatRes.nextToken ?? undefined;
        } while (chatToken);

        if (usersScanned % 500 === 0) {
          log(`Scanned ${usersScanned} users, ${chatsQueued} chats queued so far (${chatsSkipped} skipped)...`);
        }
      }

      profileToken = profileRes.nextToken ?? undefined;
    } while (profileToken);

    log(
      `Finished scan: ${chatsQueued} chats queued for memory backfill (${chatsSkipped} already done, ${usersScanned} users scanned)`
    );
  },
});
