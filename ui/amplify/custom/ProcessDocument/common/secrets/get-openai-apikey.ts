import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";

const secret_name = "openai/api-key";

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

type APIType = {
  "openai/api-key": string;
}

export const getOpenaiApiKey = async () => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    return openaiApiKey;
  }

  try {
    const command = new GetSecretValueCommand({
        SecretId: secret_name,
    });
    const response = await client.send(command);
    const apiType: APIType = JSON.parse(response.SecretString || '{}');
    return apiType["openai/api-key"];
  } catch (error) {
    console.error('Error getting openai api key', error);
  }
};