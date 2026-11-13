import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepFileTypeDetection(
  scope: Construct,
  lambdaFunction: lambda.IFunction
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-file-type-detection',
    {
      stateName: 'Call File Type Detection Lambda',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        documentUuid: '{% $documentUuid %}',
        documentCount: '{% $documentCount %}',
        documentType: '{% $documentType %}',
        userUuid: '{% $userUuid %}',
        documentUrl: '{% $documentUrl %}',
      }),
    }
  )
  .addRetry({
    errors: [
      'Lambda.ServiceException', 
      'Lambda.AWSLambdaException',
      'ContentNotFoundError',
      'ParseError',
      'ValidationError'
    ],
    interval: Duration.seconds(1),
    maxAttempts: 3,
    backoffRate: 2,
  })
  .addRetry({
    errors: ['NoResponseError'],
    interval: Duration.seconds(60),
    maxAttempts: 3,
    backoffRate: 2,
  });

  return { step, lambdaFunction };
}

