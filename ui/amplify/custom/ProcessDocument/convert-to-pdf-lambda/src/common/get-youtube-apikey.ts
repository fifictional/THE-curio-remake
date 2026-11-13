import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secret_name = "youtube/api-key";

const secretsManagerClient = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});

type APIType = {
  "youtube/api-key": string;
};

// Cache the API key for the Lambda container lifetime
let cachedApiKey: string | null = null;

export const getYoutubeApiKey = async (): Promise<string> => {
  // Return cached value if available
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secret_name,
    });
    const response = await secretsManagerClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret string is empty');
    }
    
    const apiType: APIType = JSON.parse(response.SecretString);
    cachedApiKey = apiType["youtube/api-key"];
    
    if (!cachedApiKey) {
      throw new Error('API key not found in secret');
    }
    
    return cachedApiKey;
  } catch (error) {
    console.error('Error getting youtube api key', error);
    throw new Error(`Failed to retrieve youtube API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
