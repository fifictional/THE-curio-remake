import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../data/resource';
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";
import { env } from '$amplify/env/retrieve-datalab-query';
import { FunctionUrlEvent } from '../subscription-update/types';
import { withSentryLambdaHandler } from "../common/sentry-lambda";



// Initialize Amplify Data client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as any);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION });

/**
 * Execute ad-hoc Cypher queries against Neptune
 * 
 * Input format:
 * {
 *   query: "MATCH (n) RETURN count(n) LIMIT 1"
 * }
 * 
 * Or for multiple queries:
 * {
 *   queries: ["MATCH (n) RETURN count(n)", "MATCH (s:Subject) RETURN s.id LIMIT 10"]
 * }
 */
const retrieveDatalabQueryHandler = async (event: FunctionUrlEvent) => {
  try {

    const body = JSON.parse(event.body) as {
      request_id: string
    };

    const datalabRequest = await client.models.DatalabRequest.get({ requestId: body.request_id });

    if (!datalabRequest?.data) {
      return new Response("Request not found", { status: 404 });
    }


    const taskToken = datalabRequest.data.taskToken;

    await sfnClient.send(
      new SendTaskSuccessCommand({
        taskToken: taskToken!,
        output: JSON.stringify({
          webhookReceived: true,
          requestId: body.request_id,
        }),
      })
    );

    // Return results
    // If single query, return single result; if multiple, return array
    return {
      statusCode: 200,
      success: true,
    };
  } catch (error) {
    console.error('Error executing Cypher query:', error);
    return {
      statusCode: 500,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
};

export const handler = withSentryLambdaHandler(retrieveDatalabQueryHandler);

