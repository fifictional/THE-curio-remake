/**
 * Gets AppSync configuration (URL and API key) from environment variables
 */
export async function getAppSyncConfig(): Promise<{ url: string; apiKey: string }> {
  // Map AMPLIFY_DATA_GRAPHQL_ENDPOINT to APPSYNC_URL if not already set
  if (process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT && !process.env.APPSYNC_URL) {
    process.env.APPSYNC_URL = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  }

  const url = process.env.APPSYNC_URL;
  if (!url) {
    throw new Error('APPSYNC_URL or AMPLIFY_DATA_GRAPHQL_ENDPOINT environment variable is not set');
  }

  // API key must be provided via environment variable
  const apiKey = process.env.APPSYNC_API_KEY;
  if (!apiKey) {
    throw new Error('APPSYNC_API_KEY environment variable is not set. This must be set manually or via a mechanism that does not create circular dependencies.');
  }

  return { url, apiKey };
}

