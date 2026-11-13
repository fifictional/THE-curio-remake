import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

let cachedClient: Client | undefined;

export function isOpensearchConfigured(): boolean {
  return Boolean(process.env.OPENSEARCH_ENDPOINT);
}

function getOpensearchEndpoint(): string {
  const endpoint = process.env.OPENSEARCH_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      'OPENSEARCH_ENDPOINT environment variable is not set. Make sure it is configured in the Lambda function environment variables.',
    );
  }
  return endpoint.startsWith('https://') ? endpoint : `https://${endpoint}`;
}

export function getOpensearchClient(): Client {
  if (!cachedClient) {
    const endpoint = getOpensearchEndpoint();
    cachedClient = new Client({
      ...AwsSigv4Signer({
        region: process.env.AWS_REGION!,
        service: 'es',
        getCredentials: defaultProvider(),
      }),
      node: endpoint,
      requestTimeout: 15_000,
    });
  }
  return cachedClient;
}

export function resetOpensearchClientForTests(): void {
  cachedClient = undefined;
}
