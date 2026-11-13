import fetch from 'node-fetch';
import { Schema } from '../../../../../../data/resource';

const mutation = `
  mutation CreateUserRequest($input: CreateUserRequestInput!) {
    createUserRequest(input: $input) {
      userUuid
      model
      promptTokenCount
      cachedContentTokenCount
      candidatesTokenCount
      thoughtsTokenCount
      toolUsePromptTokenCount
      totalTokenCount
      image
      requestStatus
      xRequestId
      xRateLimitLimitRequests
      xRateLimitLimitTokens
      xRateLimitRemainingRequests
      xRateLimitRemainingTokens
      xRateLimitResetRequests
      xRateLimitResetTokens
      documentUuid
      createdAt
      updatedAt
    }
  }
`;

export const createUserRequest = async (userRequest: Schema['UserRequest']['createType']) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: userRequest,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create user request');
  }
};