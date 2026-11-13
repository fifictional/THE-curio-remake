import { useCallback } from 'react';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useSessionContext } from '@/providers/session-provider';
import { uploadData } from 'aws-amplify/storage';
import { QuestionExtractJob } from './use-question-extractor.api';
import { v4 as uuidv4 } from 'uuid';

export function useAnswerKeyUploadApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();

  // Upload answer key file and trigger module extraction (Phase 1)
  const uploadAnswerKey = useCallback(async (job: QuestionExtractJob, file: File) => {
    if (!job) {
      console.error('No job provided to upload answer key for');
      return false;
    }

    if (!userAttributes) {
      console.error('No user attributes available');
      return false;
    }

    try {
      // 1. Upload file to S3
      const s3Key = `exam-papers/${userAttributes.userUuid}/${job.questionExtractJobUuid}/answer-key/${file.name}`;
      
      await uploadData({
        path: s3Key,
        data: file,
        options: {
          contentType: file.type,
        },
      }).result;

      console.log('Answer key uploaded to S3:', s3Key);

      // 2. Update job with answer key info
      await client.models.QuestionExtractJob.update({
        questionExtractJobUuid: job.questionExtractJobUuid,
        answerKeyS3Key: s3Key,
        answerKeyFileName: file.name,
        answerKeyStatus: 'PENDING',
        updatedAt: new Date().toISOString(),
      });

      // 3. Create task for answer module extraction (Phase 1)
      const taskUuid = uuidv4();
      await client.models.Task.create({
        taskUuid,
        userUuid: userAttributes.userUuid,
        type: 'EXTRACT_ANSWER_MODULES',
        status: 'PENDING',
        progress: 0,
        args: JSON.stringify({ 
          questionExtractJobUuid: job.questionExtractJobUuid,
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log('Answer module extraction task created successfully');
      return true;

    } catch (error) {
      console.error('Error uploading answer key:', error);
      alert('Failed to upload answer key. Please try again.');
      return false;
    }
  }, [userAttributes, client]);

  return {
    uploadAnswerKey,
  };
}

