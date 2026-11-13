import { Logger } from "@aws-lambda-powertools/logger";
import { QuizType } from "../../ai/validations/outputs-validations";
import { createQuestion } from "./create-question";

const logger = new Logger({
  logLevel: "INFO",
  serviceName: "document-processor/create-quiz",
});

export const createQuestions = async (documentUuid: string, userUuid: string, questions: QuizType, spaceUuid: string | null) => {
  logger.info('Creating questions:', { documentUuid, userUuid, questionCount: questions.questions?.length || 0 });

  if (!questions.questions || questions.questions.length === 0) {
    logger.warn('No questions to create');
    return;
  }

  for (const question of questions.questions) {
    try {
      await createQuestion({
        userUuid: userUuid,
        documentUuid: documentUuid,
        questionContent: question.question.question_content,
        questionReferences: question.question.question_references?.map(ref => ({
          reference_type: ref.reference_type || "",
          reference_name: ref.reference_name || "",
          reference_content: ref.reference_content || "",
          reference_url: ref.reference_url || "",
        })) || [],
        options: question.options,
        answer: question.answer,
        hint: question.hint,
        answerExplanations: question.answerExplanations,
        spaceUuid: spaceUuid || null,
      });
      logger.info('Question created successfully');
    } catch (error) {
      logger.error('Failed to create question:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        questionContent: question.question.question_content 
      });
      // Continue with other questions even if one fails
    }
  }
  
  logger.info('Finished creating questions');
};