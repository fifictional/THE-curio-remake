import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";

const secret_name = "anthropic/api-key";

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

type APIType = {
  "anthropic/api-key": string;
}

export const getAnthropicApiKey = async () => {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicApiKey) {
    return anthropicApiKey;
  }

  try {
    const command = new GetSecretValueCommand({
        SecretId: secret_name,
    });
    const response = await client.send(command);
    const apiType: APIType = JSON.parse(response.SecretString || '{}');
    return apiType["anthropic/api-key"];
  } catch (error) {
    console.error('Error getting anthropic api key', error);
  }
};
