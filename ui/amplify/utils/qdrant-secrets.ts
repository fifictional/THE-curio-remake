import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export interface QdrantConnectionConfig {
  url: string;
  apiKey?: string;
}

let cachedConfig: QdrantConnectionConfig | undefined;

export function isQdrantConfigured(): boolean {
  return Boolean(process.env.QDRANT_URL || process.env.QDRANT_SECRET_NAME);
}

export async function resolveQdrantConfig(): Promise<QdrantConnectionConfig> {
  if (cachedConfig) return cachedConfig;

  if (process.env.QDRANT_URL) {
    cachedConfig = {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    };
    return cachedConfig;
  }

  const secretName = process.env.QDRANT_SECRET_NAME || 'qdrant/config';
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  const parsed = JSON.parse(response.SecretString || '{}') as {
    url?: string;
    apiKey?: string;
  };

  if (!parsed.url) {
    throw new Error(`Qdrant URL missing in secret ${secretName}`);
  }

  cachedConfig = {
    url: parsed.url,
    apiKey: parsed.apiKey,
  };
  return cachedConfig;
}

export function resetQdrantConfigForTests(): void {
  cachedConfig = undefined;
}
