import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const mutation = `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      questionUuid
      userUuid
      spaceUuid
      documentUuid
      questionContent
      questionReferences {
        reference_type
        reference_name
        reference_content
        reference_url
      }
      options
      answer
      hint
      answerExplanations
      createdAt
      updatedAt
    }
  }
`;

type QuestionReference = {
  reference_type: string;
  reference_name: string;
  reference_content: string;
  reference_url: string;
};

type CreateQuestionInput = {
  userUuid: string;
  documentUuid: string;
  questionContent: string;
  questionReferences?: QuestionReference[];
  options: string[];
  answer: number;
  hint?: string;
  answerExplanations?: string[];
  spaceUuid: string | null;
};

export const createQuestion = async ({ userUuid, documentUuid, questionContent, questionReferences, options, answer, hint, answerExplanations, spaceUuid }: CreateQuestionInput) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          questionUuid: uuidv4(),
          userUuid: userUuid,
          documentUuid: documentUuid,
          questionContent: questionContent,
          questionReferences: questionReferences,
          options: options,
          answer: answer,
          hint: hint,
          answerExplanations: answerExplanations,
          spaceUuid: spaceUuid,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create question');
  }
};