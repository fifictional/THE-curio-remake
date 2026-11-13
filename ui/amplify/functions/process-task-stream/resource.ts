import * as url from 'node:url';
import { defineFunction } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { EventSourceMapping, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { CDKContextKey } from "@aws-amplify/platform-core";

export const processTaskStream = defineFunction((scope) =>
  new lambda.NodejsFunction(scope, "processTaskStream", {
    entry: url.fileURLToPath(new URL('handler.ts', import.meta.url)),
    runtime: Runtime.NODEJS_20_X,
    environment: {
      AWS_BRANCH: process.env.AWS_BRANCH || "local",
      USER_NAME: scope.node.getContext(CDKContextKey.BACKEND_NAME),
    },
    memorySize: 1024,
  })
);

export const addPoliciesAndStream = (taskTable: ITable, processTaskStreamLambda: IFunction) => {
  const policy = new Policy(
    Stack.of(taskTable),
    "MyDynamoDBFunctionStreamingPolicy",
    {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:ListStreams",
            "sqs:SendMessage",
            "ssm:GetParameter",
          ],
          resources: ["*"],
        }),
      ],
    }
  );
  processTaskStreamLambda.role?.attachInlinePolicy(policy);

  const mapping = new EventSourceMapping(
    Stack.of(taskTable),
    "MyDynamoDBFunctionTaskEventStreamMapping",
    {
      target: processTaskStreamLambda,
      eventSourceArn: taskTable.tableStreamArn,
      startingPosition: StartingPosition.LATEST,
    }
  );
  mapping.node.addDependency(policy);
}