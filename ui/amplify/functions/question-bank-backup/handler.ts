import { DynamoDBClient, ExportTableToPointInTimeCommand } from '@aws-sdk/client-dynamodb';
import type { EventBridgeEvent } from 'aws-lambda';
import { withSentryLambdaHandler } from '../common/sentry-lambda';

const dynamodbClient = new DynamoDBClient({});

// QuestionBank tables to backup
const TABLES_TO_BACKUP = [
  'ExtractedQuestion',
  'ExamModule',
  'QuestionExtractJob',
  'QuestionGenerationJob',
] as const;

/**
 * Lambda handler for weekly QuestionBank table backups
 * Exports each table to S3 using DynamoDB Export API
 * Triggered by EventBridge scheduled rule
 */
const questionBankBackupHandler = async (
  event: EventBridgeEvent<'Scheduled Event', unknown>
): Promise<{ statusCode: number; body: string }> => {
  console.log('Starting QuestionBank backup process', { event });

  const backupBucket = process.env.BACKUP_BUCKET_NAME;
  if (!backupBucket) {
    throw new Error('BACKUP_BUCKET_NAME environment variable is required');
  }

  const results: Array<{ table: string; success: boolean; exportArn?: string; error?: string }> = [];

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      // Get the table ARN from environment variables
      // Map table names to environment variable names
      const envVarMap: Record<string, string> = {
        'ExtractedQuestion': 'EXTRACTED_QUESTION_TABLE_ARN',
        'ExamModule': 'EXAMMODULE_TABLE_ARN',
        'QuestionExtractJob': 'QUESTIONEXTRACTJOB_TABLE_ARN',
        'QuestionGenerationJob': 'QUESTIONGENERATIONJOB_TABLE_ARN',
      };
      
      const envVarName = envVarMap[tableName];
      if (!envVarName) {
        throw new Error(`No environment variable mapping for table ${tableName}`);
      }
      
      const tableArn = process.env[envVarName];
      
      if (!tableArn) {
        throw new Error(`Table ARN not found for ${tableName} (env var: ${envVarName})`);
      }

      // Generate S3 export path with timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const s3Prefix = `exports/${tableName}/${timestamp}/`;

      // Export time: current time as Date object
      const exportTime = new Date();

      console.log(`Starting export for ${tableName}`, { tableArn, s3Prefix, exportTime });

      // Start the export task using ExportTableToPointInTime
      const exportCommand = new ExportTableToPointInTimeCommand({
        TableArn: tableArn,
        S3Bucket: backupBucket,
        S3Prefix: s3Prefix,
        ExportFormat: 'DYNAMODB_JSON', // or 'ION' for Ion format
        ExportType: 'FULL_EXPORT',
        ExportTime: exportTime,
      });

      const response = await dynamodbClient.send(exportCommand);
      
      console.log(`Export started for ${tableName}`, { 
        exportArn: response.ExportDescription?.ExportArn,
        status: response.ExportDescription?.ExportStatus 
      });

      results.push({
        table: tableName,
        success: true,
        exportArn: response.ExportDescription?.ExportArn,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to export ${tableName}:`, errorMessage);
      
      results.push({
        table: tableName,
        success: false,
        error: errorMessage,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log('Backup process completed', {
    total: TABLES_TO_BACKUP.length,
    success: successCount,
    failures: failureCount,
    results,
  });

  return {
    statusCode: failureCount === 0 ? 200 : 207, // 207 = Multi-Status
    body: JSON.stringify({
      message: `Backup completed: ${successCount} succeeded, ${failureCount} failed`,
      results,
    }),
  };
};

export const handler = withSentryLambdaHandler(questionBankBackupHandler);
