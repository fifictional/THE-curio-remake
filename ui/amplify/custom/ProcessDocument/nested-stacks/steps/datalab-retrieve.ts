import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepDatalabRetrieve(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-datalab-retrieve',
    {
      stateName: 'Retrieve Datalab Results',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        documentUuid: '{% $documentUuid %}',
        taskUuid: '{% $taskUuid %}',
        userUuid: '{% $userUuid %}',
        requestId: '{% $states.input.requestId %}',
      }),
      assign: {
        enrichedMarkdown: '{% $states.result.Payload.enrichedMarkdown %}'
      },
    }
  )
  .addRetry({
    errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.Unknown', 'FETCH_FAILED'],
    interval: Duration.seconds(5),
    maxAttempts: 3,
    backoffRate: 2,
  })
  .addRetry({
    errors: ['RATE_LIMIT', 'TIMEOUT'],
    interval: Duration.seconds(60),
    maxAttempts: 3,
    backoffRate: 2,
  });

  return { step, lambdaFunction };
}

