import { NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

/**
 * Amplify function resource interface (has addEnvironment method)
 */
interface AmplifyFunctionResource {
  addEnvironment(key: string, value: string): void;
  resources: {
    lambda: lambda.IFunction;
  };
}

export interface QuestionBankBackupStackProps {
  backupFunction: AmplifyFunctionResource;
  tables: {
    ExtractedQuestion: { tableArn: string; tableName: string };
    ExamModule: { tableArn: string; tableName: string };
    QuestionExtractJob: { tableArn: string; tableName: string };
    QuestionGenerationJob: { tableArn: string; tableName: string };
  };
  currentBranch: string;
}

export class QuestionBankBackupStack extends NestedStack {
  public readonly backupBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: QuestionBankBackupStackProps) {
    super(scope, id);

    const { backupFunction, tables, currentBranch } = props;
    const backupLambda = backupFunction.resources.lambda;
    const userName = process.env.USER || process.env.LOGNAME || 'unknown';
    const nameSuffix = currentBranch === "local" ? `${currentBranch}-${userName}` : currentBranch;

    // Create S3 bucket for backups with encryption and lifecycle
    this.backupBucket = new s3.Bucket(this, 'QuestionBankBackupBucket', {
      bucketName: `question-bank-backups-${nameSuffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'expire-old-backups',
          expiration: Duration.days(30), // Keep backups for 30 days
          enabled: true,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Grant Lambda permission to write to the bucket
    this.backupBucket.grantWrite(backupLambda);

    // Set environment variables for Lambda (on Amplify function resource)
    backupFunction.addEnvironment('BACKUP_BUCKET_NAME', this.backupBucket.bucketName);
    backupFunction.addEnvironment('EXTRACTED_QUESTION_TABLE_ARN', tables.ExtractedQuestion.tableArn);
    backupFunction.addEnvironment('EXAMMODULE_TABLE_ARN', tables.ExamModule.tableArn);
    backupFunction.addEnvironment('QUESTIONEXTRACTJOB_TABLE_ARN', tables.QuestionExtractJob.tableArn);
    backupFunction.addEnvironment('QUESTIONGENERATIONJOB_TABLE_ARN', tables.QuestionGenerationJob.tableArn);

    // Grant Lambda permission to start DynamoDB exports
    backupLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:ExportTableToPointInTime',
          'dynamodb:DescribeExport',
        ],
        resources: [
          tables.ExtractedQuestion.tableArn,
          tables.ExamModule.tableArn,
          tables.QuestionExtractJob.tableArn,
          tables.QuestionGenerationJob.tableArn,
        ],
      })
    );

    // Create EventBridge rule for weekly backup (every Sunday at 2 AM UTC)
    const weeklyBackupRule = new events.Rule(this, 'WeeklyBackupRule', {
      ruleName: `question-bank-weekly-backup-${nameSuffix}`,
      description: 'Triggers weekly backup of QuestionBank tables',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        month: '*',
        weekDay: 'SUN', // Every Sunday
      }),
      enabled: true,
    });

    // Add Lambda as target
    weeklyBackupRule.addTarget(new targets.LambdaFunction(backupLambda));
  }
}
