import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepConvertToPdf(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-convert-to-pdf',
    {
      stateName: 'Call Convert to PDF Lambda',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        documentUuid: '{% $documentUuid %}',
      }),
      assign: {
        documentUrl: '{% $states.result.Payload.documentUrl %}',
        documentCount: '{% $states.result.Payload.documentCount %}',
        documentType: '{% $states.result.Payload.documentType %}',
      },
    }
  )
  .addRetry({
    errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException', 'Lambda.Unknown', 'FETCH_FAILED', 'SupadataError'],
    interval: Duration.seconds(5),
    maxAttempts: 3,
    backoffRate: 2,
  });

  return { step, lambdaFunction };
}

