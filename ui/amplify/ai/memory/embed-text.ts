import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({});
const MODEL_ID = 'amazon.titan-embed-text-v2:0';

export async function embedText(text: string): Promise<number[]> {
  const embedResp = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify({ inputText: text.slice(0, 8000) }),
    })
  );
  const embeddingStr = new TextDecoder().decode(embedResp.body);
  return JSON.parse(embeddingStr).embedding as number[];
}
