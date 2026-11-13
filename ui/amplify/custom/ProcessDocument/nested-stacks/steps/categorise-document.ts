import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

export function buildStepCategoriseDocument(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-categorise-document',
    {
      stateName: 'Call Categorise Document Lambda',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        documentUuid: '{% $documentUuid %}',
        userUuid: '{% $userUuid %}',
        taskUuid: '{% $taskUuid %}',
        enrichedMarkdown: '{% $enrichedMarkdown %}',
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

  // Add SSM permissions only for CDK Lambda functions (Amplify functions are configured in backend.ts)
  if (lambdaFunction instanceof lambdaNodejs.NodejsFunction && lambdaFunction.node.id) {
    lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ['*'],
    }));
  }

  return { step, lambdaFunction };
}

