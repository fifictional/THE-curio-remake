import type { Schema } from '../../data/resource';
import { generateClient } from 'aws-amplify/api';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { S3Client } from '@aws-sdk/client-s3';
import { deleteDocumentData } from '../common/delete-document';
import { deleteChatData } from '../common/delete-chat';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface DeleteUserDeps {
  s3: S3Client;
  cognitoClient: CognitoIdentityProviderClient;
  bucketName: string;
  openSearchIndex: string;
  userPoolId?: string;
  logger?: Logger;
  getUser?: (
    userPoolId: string,
    userUuid: string,
  ) => Promise<{ Attributes?: Array<{ Name?: string; Value?: string }> } | null>;
}

export interface DeleteUserOutput {
  success: boolean;
  message: string;
}

const defaultLogger = new Logger({
  logLevel: 'INFO',
  serviceName: 'delete-user-handler',
});

async function deleteUserDocuments(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user documents', { userUuid });

  const { s3, bucketName, openSearchIndex } = deps;
  
  let nextToken: string | undefined;
  do {
    const documents = await client.models.Document.listDocumentByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const document of documents.data || []) {
      try {
        await deleteDocumentData(
          client,
          s3,
          document.documentUuid,
          bucketName,
          openSearchIndex,
          logger
        );
      } catch (error) {
        logger.error('Failed to delete document', { documentUuid: document.documentUuid, error });
        // Continue with other documents even if one fails
      }
    }

    nextToken = documents.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all chats and messages for a user
 */
async function deleteUserChats(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user chats', { userUuid });
  
  let nextToken: string | undefined;
  do {
    const chats = await client.models.Chat.listChatByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const chat of chats.data || []) {
      try {
        await deleteChatData(client, chat.chatUuid, logger);
      } catch (error) {
        logger.error('Failed to delete chat', { chatUuid: chat.chatUuid, error });
        // Continue with other chats even if one fails
      }
    }

    nextToken = chats.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all spaces for a user
 */
async function deleteUserSpaces(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user spaces', { userUuid });
  
  const spaces = await client.models.Space.listSpaceByUserUuid({
    userUuid,
  }, { limit: 1000 });

  for (const space of spaces.data || []) {
    await client.models.Space.delete({
      spaceUuid: space.spaceUuid,
    });
  }
}

/**
 * Delete all flashcards for a user (standalone, not tied to documents)
 */
async function deleteUserFlashcards(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user flashcards', { userUuid });
  
  let nextToken: string | undefined;
  do {
    const flashcards = await client.models.Flashcard.listFlashcardByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const flashcard of flashcards.data || []) {
      await client.models.Flashcard.delete({
        flashcardUuid: flashcard.flashcardUuid,
        createdAt: flashcard.createdAt,
      });
    }

    nextToken = flashcards.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all quizzes for a user
 */
async function deleteUserQuizzes(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user quizzes', { userUuid });
  
  let nextToken: string | undefined;
  do {
    const quizzes = await client.models.Quiz.listQuizByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const quiz of quizzes.data || []) {
      // Delete quiz questions
      const quizQuestions = await client.models.QuizQuestion.listQuizQuestionByQuizUuid({
        quizUuid: quiz.quizUuid,
      }, { limit: 1000 });

      for (const quizQuestion of quizQuestions.data || []) {
        await client.models.QuizQuestion.delete({
          quizQuestionUuid: quizQuestion.quizQuestionUuid,
        });
      }

      // Delete quiz
      await client.models.Quiz.delete({
        quizUuid: quiz.quizUuid,
      });
    }

    nextToken = quizzes.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all mock exams and logs for a user
 */
async function deleteUserMockExams(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user mock exams', { userUuid });
  
  let nextToken: string | undefined;
  do {
    const mockExams = await client.models.MockExam.listMockExamByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const mockExam of mockExams.data || []) {
      // Delete mock exam logs
      const logs = await client.models.MockExamLog.listMockExamLogByMockExamUuidAndCompletedAt({
        mockExamUuid: mockExam.mockExamUuid,
      }, { limit: 1000 });

      for (const log of logs.data || []) {
        await client.models.MockExamLog.delete({
          mockExamLogUuid: log.mockExamLogUuid,
        });
      }

      // Delete mock exam
      await client.models.MockExam.delete({
        mockExamUuid: mockExam.mockExamUuid,
      });
    }

    nextToken = mockExams.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all exam papers for a user
 */
async function deleteUserExamPapers(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user exam papers', { userUuid });
  
  let nextToken: string | undefined;
  do {
    const examPapers = await client.models.ExamPaper.listExamPaperByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const examPaper of examPapers.data || []) {
      // Delete exam paper questions
      const questions = await client.models.ExamPaperQuestion.listExamPaperQuestionByExamPaperUuidAndQuestionNumber({
        examPaperUuid: examPaper.examPaperUuid,
      }, { limit: 1000 });

      for (const question of questions.data || []) {
        await client.models.ExamPaperQuestion.delete({
          examPaperQuestionUuid: question.examPaperQuestionUuid,
        });
      }

      // Delete exam paper
      await client.models.ExamPaper.delete({
        examPaperUuid: examPaper.examPaperUuid,
      });
    }

    nextToken = examPapers.nextToken || undefined;
  } while (nextToken);
}

/**
 * Delete all other user-related data
 */
async function deleteUserOtherData(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting other user data', { userUuid });

  // Delete user requests
  let nextToken: string | undefined;
  do {
    const requests = await client.models.UserRequest.listUserRequestByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const request of requests.data || []) {
      await client.models.UserRequest.delete({
        userUuid: request.userUuid,
        createdAt: request.createdAt,
      });
    }

    nextToken = requests.nextToken || undefined;
  } while (nextToken);

  // Delete tasks
  nextToken = undefined;
  do {
    const tasks: any = await client.models.Task.listTaskByUserUuidAndCreatedAt({
      userUuid,
    }, {
      limit: 100,
      nextToken,
    });

    for (const task of tasks.data || []) {
      await client.models.Task.delete({
        taskUuid: task.taskUuid,
      });
    }

    nextToken = tasks.nextToken || undefined;
  } while (nextToken);

  // Delete user learning profile history
  const profileHistory = await client.models.UserLearningProfileHistory.listUserLearningProfileHistoryByUserUuidAndCreatedAt({
    userUuid,
  }, { limit: 1000 });

  for (const history of profileHistory.data || []) {
    await client.models.UserLearningProfileHistory.delete({
      userLearningProfileHistoryUuid: history.userLearningProfileHistoryUuid,
    });
  }
}

/**
 * Delete user subscriptions and purchases
 */
async function deleteUserSubscriptions(
  client: DataClient,
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting user subscriptions', { userUuid });

  // Delete subscriptions (using userId, not userUuid)
  const subscriptions = await client.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({
    userId: userUuid,
  }, { limit: 1000 });

  for (const subscription of subscriptions.data || []) {
    await client.models.CurioSubscription.delete({
      subscriptionId: subscription.subscriptionId,
    });
  }

  // Delete purchases (composite key: userId + bundleUuid)
  const purchases = await client.models.Purchase.listPurchaseByUserIdAndPurchasedAt({
    userId: userUuid,
  }, { limit: 1000 });

  for (const purchase of purchases.data || []) {
    await client.models.Purchase.delete({
      userId: purchase.userId,
      bundleUuid: purchase.bundleUuid,
    });
  }

  // Note: Receipts don't have a direct userId index, and CurioUser model doesn't exist
  // FutureUser deletion will be handled after we get user email from UserProfile
}

/**
 * Delete Cognito user
 */
async function deleteCognitoUser(
  deps: DeleteUserDeps,
  userUuid: string,
): Promise<void> {
  const logger = deps.logger ?? defaultLogger;
  logger.info('Deleting Cognito user', { userUuid });

  const userPoolId = deps.userPoolId;
  if (!userPoolId) {
    logger.warn('COGNITO_USER_POOL_ID not set, skipping Cognito user deletion');
    return;
  }

  try {
    await deps.cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: userUuid,
    }));
    logger.info('Cognito user deleted successfully', { userUuid });
  } catch (error: any) {
    if (error.name === 'UserNotFoundException') {
      logger.info('Cognito user not found, continuing', { userUuid });
    } else {
      logger.error('Failed to delete Cognito user', { userUuid, error });
      throw error;
    }
  }
}

export async function runDeleteUser(
  client: DataClient,
  userUuid: string,
  deps: DeleteUserDeps,
): Promise<DeleteUserOutput> {
  const logger = deps.logger ?? defaultLogger;

  if (!userUuid) {
    logger.error('User UUID is required');
    throw new Error('User UUID is required');
  }

  logger.info('Starting user deletion', { userUuid });

  try {
    await deleteUserDocuments(client, deps, userUuid);
    await deleteUserChats(client, deps, userUuid);
    await deleteUserFlashcards(client, deps, userUuid);
    await deleteUserQuizzes(client, deps, userUuid);
    await deleteUserMockExams(client, deps, userUuid);
    await deleteUserExamPapers(client, deps, userUuid);
    await deleteUserSpaces(client, deps, userUuid);
    await deleteUserOtherData(client, deps, userUuid);
    await deleteUserSubscriptions(client, deps, userUuid);

    try {
      const userProfile = await client.models.UserProfile.get({ userUuid });
      if (userProfile.data) {
        const userPoolId = deps.userPoolId;
        if (userPoolId) {
          try {
            const getUserFn =
              deps.getUser ??
              (await import('../../utils/lambda-utils')).getUser;
            const cognitoUser = await getUserFn(userPoolId, userUuid);
            const userEmail = cognitoUser?.Attributes?.find(
              (attr) => attr.Name === 'email',
            )?.Value;

            if (userEmail) {
              const futureUsers = await client.models.FutureUser.listFutureUserByEmail(
                { email: userEmail },
                { limit: 1000 },
              );

              for (const futureUser of futureUsers.data || []) {
                await client.models.FutureUser.delete({
                  futureUserUuid: futureUser.futureUserUuid,
                });
              }
            }
          } catch (error) {
            logger.warn('Failed to delete FutureUser records', { userUuid, error });
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get user profile for FutureUser deletion', {
        userUuid,
        error,
      });
    }

    try {
      await client.models.UserProfile.delete({ userUuid });
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name !== 'NotFoundError') {
        logger.warn('Failed to delete user profile', { userUuid, error });
      }
    }

    await deleteCognitoUser(deps, userUuid);

    try {
      const { deleteVectorsForUser } = await import('../../utils/vector-store/vector-delete');
      const deleted = await deleteVectorsForUser(userUuid);
      if (deleted > 0) {
        logger.info(`Deleted ${deleted} vector chunks for user`, { userUuid });
      }
    } catch (error) {
      logger.warn('Failed to delete user vectors (non-fatal)', { userUuid, error });
    }

    logger.info('User deletion completed successfully', { userUuid });

    return {
      success: true,
      message: 'User and all associated data deleted successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error deleting user', { userUuid, error: message });
    throw error;
  }
}

