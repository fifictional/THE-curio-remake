import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepDatalabWaitForToken(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-datalab-wait-for-token',
    {
      stateName: 'Wait for token to resume Datalab Results',

      lambdaFunction,

      // ✅ This is what actually pauses the state machine
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,

      // ✅ MUST use payload (arguments is not exposed in CDK)
      payload: sfn.TaskInput.fromObject({
        taskToken: '{% $states.context.Task.Token %}',

        documentUuid: '{% $documentUuid %}',
        taskUuid: '{% $taskUuid %}',
        userUuid: '{% $userUuid %}',
        requestId: "{% $states.input.requestId %}"
      }),
    }
  );

  return { step };
}
