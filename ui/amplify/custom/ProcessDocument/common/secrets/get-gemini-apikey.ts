import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  
  const secret_name = "gemini-api-key";

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });
  
  type APIType = {
      "GOOGLE_GENAI_API_KEY": string;
  }
  
  export const getGeminiApiKey = async () => {
    const command = new GetSecretValueCommand({
        SecretId: secret_name,
    });
    const response = await client.send(command);
    const apiType: APIType = JSON.parse(response.SecretString || '{}');
    return apiType["GOOGLE_GENAI_API_KEY"];
};