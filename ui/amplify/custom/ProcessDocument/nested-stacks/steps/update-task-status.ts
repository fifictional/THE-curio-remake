import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function buildStepUpdateTaskStatus(
  scope: Construct,
  lambdaFunction: lambda.IFunction,
  environment: Record<string, string>
) {
  const step = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-update-task-status-failed',
    { 
      stateName: 'Update Task Status to FAILED',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        taskUuid: '{% $taskUuid %}',
        status: 'FAILED',
      }),
      outputs: {}
    });

  const completedStep = sfnTasks.LambdaInvoke.jsonata(
    scope,
    'step-update-task-status-completed',
    { 
      stateName: 'Update Task Status to COMPLETED',
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        taskUuid: '{% $taskUuid %}',
        status: 'COMPLETED',
      }),
      outputs: {}
    });

  const catchStep = new sfn.Fail(scope, 'step-update-task-status-lambda-fail', {
    stateName: 'Update Task Status Failed',
    cause: 'Error calling update task status lambda',
  });

  return {
    stepSetFailed: step.addCatch(catchStep).next(catchStep),
    stepSetCompleted: completedStep.addCatch(catchStep),
  };
}

