import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  
  const secret_name = "mixpanel";

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });
  
  type APIType = {
      "key": string;
  }
  
  export const getMixpanelKey = async () => {
    const command = new GetSecretValueCommand({
        SecretId: secret_name,
    });
    const response = await client.send(command);
    const apiType: APIType = JSON.parse(response.SecretString || '{}');
    return apiType["key"];
};