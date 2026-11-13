import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepDatalabSubmit(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-datalab-submit',
    {
      stateName: 'Submit Document to Datalab',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        taskUuid: '{% $taskUuid %}',
        documentUuid: '{% $documentUuid %}',
      }),
      outputs: {
        requestId: '{% $states.result.Payload.requestId %}'
      },
    }
  )
  .addRetry({
    errors: [
      'Lambda.ServiceException', 
      'Lambda.AWSLambdaException', 
      'Lambda.Unknown',
      'SERVER_ERROR',
      'API_ERROR',
      'PRESIGNED_URL_ERROR',
      'VALIDATION_ERROR'
    ],
    interval: Duration.seconds(5),
    maxAttempts: 3,
    backoffRate: 2,
  })
  .addRetry({
    errors: ['RATE_LIMIT'],
    interval: Duration.seconds(60),
    maxAttempts: 3,
    backoffRate: 2,
  });

  return { step, lambdaFunction };
}

