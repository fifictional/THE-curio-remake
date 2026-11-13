import type { Schema } from "../../../../data/resource";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env as mutatorEnv } from "$amplify/env/batch-mutator";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { registerMutator } from "../../../../common/batch-processing";
import { JOB_NAME, ChatSummaryEmbedJob } from "./interface";
import { embedChatSummaryContent } from "../../../../utils/document-embedding";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  mutatorEnv as any
);
Amplify.configure(resourceConfig, libraryOptions);
const mutatorClient = generateClient<Schema>();
const bedrock = new BedrockRuntimeClient({});

/** Messages older than this (ms) are summarised */
const SUMMARY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Summarise text using Bedrock (Titan Text or Claude).
 * Fails gracefully - returns original text if summarisation fails.
 */
async function summarizeWithBedrock(text: string): Promise<string> {
  if (!text.trim()) return "";
  try {
    const body = JSON.stringify({
      inputText: `Summarise the following chat conversation concisely, preserving key topics, decisions, and facts. Output only the summary:\n\n${text.slice(0, 50000)}`,
      textGenerationConfig: {
        maxTokenCount: 2000,
        temperature: 0.2,
      },
    });
    const resp = await bedrock.send(
      new InvokeModelCommand({
        modelId: "amazon.titan-text-express-v1",
        body,
        contentType: "application/json",
        accept: "application/json",
      })
    );
    const decoded = new TextDecoder().decode(resp.body);
    const parsed = JSON.parse(decoded);
    const summary = parsed.results?.[0]?.outputText || parsed.outputText || text;
    return String(summary).trim();
  } catch (err) {
    console.error("[chat-summary-embed] Bedrock summarisation failed:", err);
    return text;
  }
}

registerMutator({
  jobType: JOB_NAME,
  processJob: async (
    job: ChatSummaryEmbedJob,
    log: (message: string) => void
  ): Promise<void> => {
    const { spaceUuid, userUuid } = job;
    log(`Processing chat summaries for space ${spaceUuid}`);

    const threshold = new Date(Date.now() - SUMMARY_THRESHOLD_MS);

    let chatToken: string | undefined;
    const allOlderMessages: string[] = [];
    const documentUuidsFromChats = new Set<string>();

    do {
      const chatRes = await mutatorClient.models.Chat.list({
        limit: 100,
        nextToken: chatToken,
        filter: { spaceUuid: { eq: spaceUuid } },
        selectionSet: ["chatUuid", "documentUuid"],
      });

      for (const chat of chatRes.data || []) {
        if (!chat.chatUuid) continue;
        let msgToken: string | undefined;
        let chatHasOlderMessages = false;
        do {
          const msgRes = await mutatorClient.models.Message.listMessageByChatUuidAndCreatedAt(
            { chatUuid: chat.chatUuid },
            { limit: 100, nextToken: msgToken, sortDirection: "ASC" }
          );
          for (const msg of msgRes.data || []) {
            if (!msg.createdAt || !msg.content) continue;
            if (new Date(msg.createdAt) >= threshold) continue;
            chatHasOlderMessages = true;
            const role = msg.role === "user" ? "User" : "Assistant";
            allOlderMessages.push(`${role}: ${msg.content}`);
          }
          msgToken = msgRes.nextToken ?? undefined;
        } while (msgToken);
        if (chatHasOlderMessages && chat.documentUuid) {
          documentUuidsFromChats.add(chat.documentUuid);
        }
      }
      chatToken = chatRes.nextToken ?? undefined;
    } while (chatToken);

    if (allOlderMessages.length === 0) {
      log(`No messages older than 24h for space ${spaceUuid}, skipping`);
      return;
    }

    const combined = allOlderMessages.join("\n\n");
    log(`Summarising ${allOlderMessages.length} older messages for space ${spaceUuid}`);
    const summary = await summarizeWithBedrock(combined);
    if (!summary.trim()) {
      log(`Summary empty for space ${spaceUuid}, skipping embed`);
      return;
    }

    const docUuid =
      documentUuidsFromChats.size === 1 ? Array.from(documentUuidsFromChats)[0]! : "";
    log(`Embedding chat summary for space ${spaceUuid}`);
    await embedChatSummaryContent(userUuid, spaceUuid, summary, docUuid);
    log(`Done embedding chat summary for space ${spaceUuid}`);
  },
});
