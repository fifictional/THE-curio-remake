import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { Schema } from "@database-schema";
import { AllModels } from "@ai-providers/all-models";

export type StoreAnalyticsProps = {
  saveTokenData: (tokenData: Schema['UserRequest']['createType']) => Promise<void>,
  cloudwatchClient: CloudWatchClient,
  model: AllModels,
  userUuid: string,
  documentUuid?: string,
  retryCount: number,
  webSearchCalled?: boolean,
  category: 'chat' | 'document' | 'generation' | 'extraction',
  feature: string,
  tokenData: {
    totalTokenCount: number,
    promptTokenCount: number,
    candidatesTokenCount: number,
    thoughtsTokenCount: number,
    toolUsePromptTokenCount: number,
    cachedContentTokenCount: number,
  },
  xRequestData: {
    requestStatus: number,
    latency: number,
    xRequestId: string,
    xRateLimitLimitRequests: number,
    xRateLimitLimitTokens: number,
    xRateLimitRemainingRequests: number,
    xRateLimitRemainingTokens: number,
    xRateLimitResetRequests: string,
    xRateLimitResetTokens: string,
  },
}

export const storeAnalytics = async ({
  saveTokenData,
  cloudwatchClient,
  model,
  webSearchCalled,
  retryCount,
  userUuid,
  documentUuid,
  category,
  feature,
  tokenData,
  xRequestData,
}: StoreAnalyticsProps) => {
    const now = new Date().toISOString();
  await saveTokenData({
    userUuid: userUuid,
    model: model,
    retryCount: retryCount,
    category: category,
    feature: feature,
    totalTokenCount: tokenData.totalTokenCount,
    promptTokenCount: tokenData.promptTokenCount,
    candidatesTokenCount: tokenData.candidatesTokenCount,
    thoughtsTokenCount: tokenData.thoughtsTokenCount,
    toolUsePromptTokenCount: tokenData.toolUsePromptTokenCount,
    cachedContentTokenCount: tokenData.cachedContentTokenCount,
    image: false,
    documentUuid: documentUuid,
    requestStatus: xRequestData.requestStatus,
    latency: xRequestData.latency,
    xRequestId: xRequestData.xRequestId,
    xRateLimitLimitRequests: xRequestData.xRateLimitLimitRequests,
    xRateLimitLimitTokens: xRequestData.xRateLimitLimitTokens,
    xRateLimitRemainingRequests: xRequestData.xRateLimitRemainingRequests,
    xRateLimitRemainingTokens: xRequestData.xRateLimitRemainingTokens,
    xRateLimitResetRequests: xRequestData.xRateLimitResetRequests,
    xRateLimitResetTokens: xRequestData.xRateLimitResetTokens,
    webSearchCalled: webSearchCalled || false,
    createdAt: now,
    updatedAt: now,
  });

  const command = new PutMetricDataCommand({
    MetricData: [
      {
        MetricName: 'Requests',
        Unit: 'Count',
        Value: 1,
        Dimensions: [
          {
            Name: 'model',
            Value: model,
          },
        ],
      },
    ],
    Namespace: 'Curio',
  });
  await cloudwatchClient.send(command);

  const tokenCommand = new PutMetricDataCommand({
    MetricData: [
      {
        MetricName: 'Tokens',
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'model',
            Value: model,
          },
        ],
        Value: tokenData.totalTokenCount,
      },
    ],
    Namespace: 'Curio',
  });
  await cloudwatchClient.send(tokenCommand);
};