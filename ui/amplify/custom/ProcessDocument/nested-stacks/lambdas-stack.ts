import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { convertToPdfFunctionHandler } from '../convert-to-pdf-lambda/resource';

export interface ProcessDocumentLambdasStackProps extends NestedStackProps {
  environment: Record<string, string>;
  bucketName: string;
}

export class ProcessDocumentLambdasStack extends NestedStack {
  public readonly convertToPdfLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: ProcessDocumentLambdasStackProps) {
    super(scope, id, props);

    const stackName = 'lambdas-stack'

    // Create Lambda function (only convert-to-pdf is still needed, others moved to Amplify functions)
    this.convertToPdfLambda = convertToPdfFunctionHandler(this, `${stackName}-convert-to-pdf`, props.environment);

    // Grant S3 permissions for convert-to-pdf lambda (read, write, delete for student-documents/*)
    // This lambda needs to read original files, write converted PDFs, and delete originals after conversion
    this.convertToPdfLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:CopyObject',
      ],
      resources: [
        `arn:aws:s3:::${props.bucketName}/student-documents/*`,
      ],
    }));

    // Export Lambda ARN for use in StateMachine stack
    new CfnOutput(this, 'ConvertToPdfLambdaArn', {
      value: this.convertToPdfLambda.functionArn,
      exportName: `${this.stackName}-ConvertToPdfLambdaArn`,
    });
  }
}

