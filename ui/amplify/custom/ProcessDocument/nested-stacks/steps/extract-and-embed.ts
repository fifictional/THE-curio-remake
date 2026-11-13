import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

export function buildStepExtractAndEmbed(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-extract-and-embed',
    {
      stateName: 'Call Extract And Embed Lambda',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        documentUuid: '{% $documentUuid %}',
        userUuid: '{% $userUuid %}',
      }),
    }
  );

  return { step, lambdaFunction };
}

