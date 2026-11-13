import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

export function buildStepCreateSummary(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-create-summary',
    {
      stateName: 'Call Create Summary Lambda',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
          documentUuid: '{% $documentUuid %}',
          userUuid: '{% $userUuid %}',
          documentType: '{% $documentType %}',
          documentUrl: '{% $documentUrl %}',
          taskUuid: '{% $taskUuid %}',
      }),
    }
  )
  .addRetry({
    errors: ['Lambda.ServiceException', 'Lambda.AWSLambdaException','ZodError', 'SyntaxError', 'ContentNotFoundError', 'ApiError', 'HeadersTimeoutError'],
    interval: Duration.seconds(1),
    maxAttempts: 3,
    backoffRate: 2,
  });

  // Add SSM permissions only for CDK Lambda functions (Amplify functions are configured in backend.ts)
  // Check if it's a concrete NodejsFunction instance (not an IFunction from Amplify)
  if (lambdaFunction instanceof lambdaNodejs.NodejsFunction && lambdaFunction.node.id) {
    lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ['*'],
    }));
  }

  return { step, lambdaFunction };
}

