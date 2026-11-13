import { defineStorage } from '@aws-amplify/backend';
import { satQuestionExtractor } from '../functions/sat-question-extractor/resource';
import { satExtractModules } from '../functions/sat-extract-modules/resource';
import { satExtractAnswerModules } from '../functions/sat-extract-answer-modules/resource';
import { processDocumentCreateSummary } from '../functions/process-document-create-summary/resource';
import { processDocumentCreateFlashcards } from '../functions/process-document-create-flashcards/resource';
import { processDocumentDatalabSubmit } from '../functions/process-document-datalab-submit/resource';
import { processDocumentDatalabRetrieve } from '../functions/process-document-datalab-retrieve/resource';
import { batchMutator } from '../functions/batch-processor/batch-mutator/resource';
import { processDocumentCategorise } from '../functions/process-document-categorise/resource';
import { processDocumentFileTypeDetection } from '../functions/process-document-file-type-detection/resource';
import { extractAndEmbedLambda } from '../functions/extract-and-embed/resource';
import { honoLight } from '../hono/lambdas/hono-light/resource';
import { honoHeavy } from '../hono/lambdas/hono-heavy/resource';
export const storage = defineStorage({
  name: 'ai-tutor-storage',
  isDefault: true,
  access: (allow) => ({
    'student-documents/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write']),
      allow.resource(honoHeavy).to(['read', 'write', 'delete']),
      allow.resource(extractAndEmbedLambda).to(['read']),
      allow.resource(processDocumentCreateSummary).to(['read', 'write']),
      allow.resource(processDocumentCategorise).to(['read']),
      allow.resource(processDocumentCreateFlashcards).to(['read']),
      allow.resource(processDocumentDatalabSubmit).to(['read']),
      allow.resource(processDocumentDatalabRetrieve).to(['read', 'write']),
      allow.resource(processDocumentFileTypeDetection).to(['read']),
      allow.resource(batchMutator).to(['read']),
    ],
    'yt-transcripts/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write']),
      allow.resource(processDocumentFileTypeDetection).to(['read']),
    ],
    'mock-exams/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['write']),
    ],
    'exam-papers/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['write']),
      allow.resource(satQuestionExtractor).to(['read', 'write', 'delete']),
      allow.resource(satExtractModules).to(['read', 'write', 'delete']),
      allow.resource(satExtractAnswerModules).to(['read', 'write', 'delete']),
      allow.resource(honoHeavy).to(['read', 'write', 'delete']),
    ],
    'generated-references/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['write']),
      allow.resource(honoHeavy).to(['read', 'write', 'delete']),
    ],
    'ai-chat-attachments/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.resource(honoHeavy).to(['read', 'write', 'delete']),
    ],
    'partnerships/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['read', 'write']),
    ],
    'generated-images/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.groups(['admin', 'student']).to(['read', 'write', 'delete']),
      allow.guest.to(['write']),
      allow.resource(honoHeavy).to(['read', 'write', 'delete']),
    ],
    'exports/memory/*': [
      allow.authenticated.to(['read']),
      allow.groups(['admin', 'student']).to(['read']),
      allow.resource(honoLight).to(['read', 'write']),
    ],
  })
});

export const promptStorage = defineStorage({
  name: 'ai-tutor-prompt-storage',
  versioned: true,
  access: (allow) => ({
    'prompts/*': [
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ]
  })
});