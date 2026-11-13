import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  
  const secret_name = "datalab-api-key";

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });
  
  type APIType = {
      "datalab-api-key": string;
  }
  
  export const getDatalabApiKey = async () => {
    const command = new GetSecretValueCommand({
      SecretId: secret_name,
    });
    const response = await client.send(command);
    const apiType: APIType = JSON.parse(response.SecretString || '{}');
    return apiType["datalab-api-key"];
  };