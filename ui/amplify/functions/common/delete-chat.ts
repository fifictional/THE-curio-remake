import type { Schema } from "../../data/resource";

type Client = ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>;

/**
 * Delete a single chat and all its associated data (messages, citations)
 * This function handles all the cascading deletes for a chat
 */
export async function deleteChatData(
  client: Client,
  chatUuid: string,
  logger?: { info: (msg: string, meta?: any) => void; warn: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void }
): Promise<void> {
  const chat = await client.models.Chat.get({ chatUuid });
  if (!chat.data) {
    throw new Error('Chat not found');
  }

  const spaceUuid = chat.data.spaceUuid;

  const deletePromises = [];

  // Delete messages
  const messages = await client.models.Message.listMessageByChatUuidAndCreatedAt({
    chatUuid,
  }, {
    selectionSet: ['messageUuid', 'createdAt'],
    limit: 1000,
  });

  for (const message of messages.data || []) {
    deletePromises.push(client.models.Message.delete({
      messageUuid: message.messageUuid,
    }));
  }

  // Delete citations
  const citations = await client.models.ChatCitation.listChatCitationByChatUuidAndCreatedAt({
    chatUuid,
  }, {
    selectionSet: ['chatCitationUuid'],
    limit: 1000,
  });

  for (const citation of citations.data || []) {
    deletePromises.push(client.models.ChatCitation.delete({
      chatCitationUuid: citation.chatCitationUuid,
    }));
  }

  await Promise.all(deletePromises);

  // Delete chat
  await client.models.Chat.delete({
    chatUuid,
  });

  // Update space to trigger cascade (fake update)
  if (spaceUuid) {
    await client.models.Space.update({
      spaceUuid,
    }, {
      selectionSet: ['spaceUuid', 'name', 'userUuid', 'updatedAt', 'createdAt', 'chats.chatUuid', 'chats.spaceUuid'] as any,
    });
  }
}

