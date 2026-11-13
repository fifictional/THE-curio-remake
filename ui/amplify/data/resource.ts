import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { mergeDuplicateUser } from "../functions/merge-duplicate-user/resource";
import { subscriptionUpdate } from "../functions/subscription-update/resource";
import { transactionCompleted } from "../functions/transaction-completed/resource";
import { satQuestionExtractor } from "../functions/sat-question-extractor/resource";
import { satExtractModules } from "../functions/sat-extract-modules/resource";
import { satExtractAnswerModules } from "../functions/sat-extract-answer-modules/resource";
import { fixQuestionConcepts } from "../functions/fix-question-concepts/resource";
import { postConfirmation } from "../auth/post-confirmation/resource";
import { postAuthentication } from "../auth/post-authentication/resource";
import { queryRagLambda } from "../functions/query-rag-lambda/resource";
import { extractAndEmbedLambda } from "../functions/extract-and-embed/resource";
import { embedSpaceFlashcards } from "../functions/embed-space-flashcards/resource";
// Phase 5 — all 26 GraphQL ops served by 3 Hono Lambdas (see §10.7).
import { honoLight } from "../hono/lambdas/hono-light/resource";
import { honoHeavy } from "../hono/lambdas/hono-heavy/resource";
import {
  Subject,
  Topic,
  Concept,
  Term,
  Exam,
  SubjectListItem,
  TopicListItem,
  ConceptListItem,
  SubjectInput,
  TopicInput,
  ConceptInput,
  TermInput,
  ExamInput,
} from "./knowledge-base-types";
import { processDocumentUpdateTaskStatus } from "../functions/process-document-update-task-status/resource";
import { processDocumentCreateSummary } from "../functions/process-document-create-summary/resource";
import { processDocumentCreateFlashcards } from "../functions/process-document-create-flashcards/resource";
import { processDocumentCategorise } from "../functions/process-document-categorise/resource";
import { processDocumentDatalabSubmit } from "../functions/process-document-datalab-submit/resource";
import { processDocumentFileTypeDetection } from "../functions/process-document-file-type-detection/resource";
import { processDocumentDatalabRetrieve } from "../functions/process-document-datalab-retrieve/resource";
// NOTE: batchMutator import removed to avoid circular dependency
// Permissions granted in backend.ts instead
import { batchMutator } from "../functions/batch-processor/batch-mutator/resource";
import { qdrantExportMutator } from "../functions/batch-processor/qdrant-export-mutator/resource";
import { retrieveDatalabQuery } from "../functions/retrieve-datalab-query/resource";
import { processDocumentDatalabWaitForToken } from "../functions/process-document-datalab-wait-for-token/resource";
import { memoryReflection } from "../functions/memory-reflection/resource";

const schema = a.schema({
  // Knowledge Base Types (imported from knowledge-base-types.ts)
  Subject,
  Topic,
  Concept,
  Term,
  Exam,
  SubjectListItem,
  TopicListItem,
  ConceptListItem,
  SubjectInput,
  TopicInput,
  ConceptInput,
  TermInput,
  ExamInput,
  // Learning Profile Types
  ConceptMastery: a.customType({
    concept: a.string().required(),
    conceptDisplayName: a.string(),
    masteryLevel: a.integer().required(),
    lastPracticedAt: a.string(),
    practiceCount: a.integer(),
    createdAt: a.string(),
    updatedAt: a.string(),
  }),
  ConceptWithHierarchy: a.customType({
    conceptId: a.string().required(),
    conceptDisplayName: a.string().required(),
    masteryLevel: a.integer().required(),
  }),
  LearningProfileUpdate: a.customType({
    conceptId: a.string().required(),
    masteryLevel: a.integer().required(),
  }),
  // for the User, look at the Auth Model in Cognito
  // Each request token cost is stored in the UserToken model
  UserRequest: a
    .model({
      userUuid: a.id().required(),
      model: a.string().required(),
      retryCount: a.integer().required(),
      promptTokenCount: a.integer().required(),
      cachedContentTokenCount: a.integer().required(),
      candidatesTokenCount: a.integer().required(),
      thoughtsTokenCount: a.integer().required(),
      toolUsePromptTokenCount: a.integer().required(),
      totalTokenCount: a.integer().required(),
      image: a.boolean().required(),
      requestStatus: a.integer().required(),
      webSearchCalled: a.boolean(),
      latency: a.integer(),
      xRequestId: a.string(),
      xRateLimitLimitRequests: a.integer(),
      xRateLimitLimitTokens: a.integer(),
      xRateLimitRemainingRequests: a.integer(),
      xRateLimitRemainingTokens: a.integer(),
      xRateLimitResetRequests: a.string(), // format 8.24s or 11ms
      xRateLimitResetTokens: a.string(), // format 8.24s or 11ms
      // Track AI call categorization for token usage limits
      category: a.enum(['chat', 'document', 'generation', 'extraction']),
      feature: a.string(), // e.g., 'chat_main', 'document_summary', etc.
      // with this we can track requests costs for documents
      documentUuid: a.id(),
      document: a.belongsTo("Document", ["documentUuid"]),
      youtubeVideoUuid: a.id(),
      youtubeVideo: a.belongsTo("YoutubeVideo", ["youtubeVideoUuid"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['userUuid', 'createdAt'])
    .authorization((allow) => [allow.publicApiKey()])
    // query for the total tokens in a minute (regardless of the userUuid)
    // query for the total tokens in a day (regardless of the userUuid)
    .secondaryIndexes((index) => [
      index("model").sortKeys(["createdAt"]),
      index("documentUuid").sortKeys(["createdAt"]),
      index("userUuid").sortKeys(["createdAt"]),
      index("category").sortKeys(["createdAt"]),
    ]),
  UserProfile: a
    .model({
      userUuid: a.id().required(),
      onboardingCompleted: a.boolean().required(),
      onboardingSkipped: a.boolean().required(),
      userEmail: a.string(), // add the email here so it's simpler to get it
      firstName: a.string(),
      lastName: a.string(),
      userDescription: a.string(),
      userHelp: a.string(),
      country: a.string(), // ISO country code (e.g., GB, US, ZA, IN)
      freeSATMockExamUuid: a.id(), // UUID of the user's free SAT practice test (if created)
      lastLoginAt: a.datetime(), // Track most recent login for canonical account selection during migration (EOPRD-817)
      // EOPRD-814: Extended personalisation onboarding (Variant B). Structured copies of
      // the free-text answers collected on the Variant B screens. Kept alongside the
      // legacy `userDescription`/`userHelp` fields so the AI chat agent's prompt injection
      // (which reads the legacy fields as human-readable context) keeps working.
      lifestage: a.string(), // one of: high-school | college | graduate | teacher | professional | other
      course: a.string(), // free text: major/year, subject, industry...
      intents: a.string().array(), // Variant B multi-select intents (exact spec strings)
      userExam: a.string(), // exam name, if the user selected an exam-related intent
      userExamDate: a.string(), // exam timeframe bucket (this_week, this_month, ...)
      userTopics: a.string(), // free text topics list
      memoryDisabled: a.boolean(), // Persistent Memory: when true, no new memories; chat may skip retrieval
      academicYear: a.string(), // e.g. "Sophomore (2nd year)" for Personalized Profile
    })
    .identifier(['userUuid'])
    .secondaryIndexes((index) => [
      index("userEmail"),
    ])
    .authorization((allow) => [allow.publicApiKey()]),
  UserActionLog: a
    .model({
      userActionLogUuid: a.id().required(),
      userUuid: a.id().required(),
      actionType: a.enum([
        'sent_chat_message',
        'analyzing_document',
        'generated_flashcards',
        'generated_quiz',
        'web_searched',
        'generated_practice_test',
        'generated_questions',
        'generated_questions_practice_test',
      ]),
      sourceType: a.enum(['chat', 'document', 'mockExam', 'youtube']),
      sourceUuid: a.id(),
      createdAt: a.datetime().required(),
    })
    .identifier(['userActionLogUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index('userUuid').sortKeys(['createdAt']),
      index('sourceUuid').sortKeys(['createdAt']),
    ]),
  Space: a
    .model({
      spaceUuid: a.id().required(),
      userUuid: a.id().required(),
      name: a.string().required(),
      documents: a.hasMany("Document", "spaceUuid"),
      chats: a.hasMany("Chat", "spaceUuid"),
      examPapers: a.hasMany("ExamPaper", "spaceUuid"),
    })
    .identifier(['spaceUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid"),
    ]),
  SpaceUsers: a
    .model({
      spaceUsersUuid: a.id().required(),
      spaceUuid: a.id().required(),
      userUuid: a.id().required(),
      level: a.integer().required(), // 0: owner, 1: editor, 2: viewer
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['spaceUsersUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("spaceUuid").sortKeys(["level", "createdAt"]),
      index("userUuid"),
    ]),
  MockDocument: a
    .model({
      mockDocumentUuid: a.id().required(),
      documentUuid: a.id().required(),
      thumbnailKey: a.string().required(),
      contentKey: a.string().required(),
      title: a.string().required(),
      description: a.string().required(),
      youtube: a.boolean().required(),
    })
    .identifier(['mockDocumentUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid"),
    ]),
  Document: a
    .model({
      documentUuid: a.id().required(),
      spaceUuid: a.id(),
      userUuid: a.id().required(),
      space: a.belongsTo("Space", "spaceUuid"),
      type: a.string().required(),
      key: a.string().required(),
      originalKey: a.string(),
      fileName: a.string().required(),
      documentCount: a.integer(),
      hasRagEmbeddings: a.boolean(),
      subjectId: a.string(),
      chats: a.hasMany("Chat", ["documentUuid"]),
      tasks: a.hasMany("Task", ["documentUuid"]),
      flashcardDeckUuid: a.id(),
      questions: a.hasMany("Question", ["documentUuid"]),
      quizzes: a.hasMany("Quiz", ["sourceUuid"]),
      documentSummaries: a.hasMany("DocumentSummary", ["documentUuid"]),
      documentVisionOutput: a.hasMany("DocumentVisionOutput", ["documentUuid"]),
      documentSections: a.hasMany("DocumentSection", ["documentUuid"]),
      userRequests: a.hasMany("UserRequest", ["documentUuid"]),
      examPapers: a.hasMany("ExamPaper", ["documentUuid"]),
      youtubeVideoUuid: a.id(),
      youtubeVideo: a.belongsTo("YoutubeVideo", ["youtubeVideoUuid"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['documentUuid'])
    .authorization((allow) => [
      // Row-level security for Cognito clients: only the user whose `sub` matches `userUuid`
      // can read/update/delete. `userUuid` is our app user id (same as Cognito `sub`).
      // Next.js API routes enforce this by using `documentUserPoolClient` (userPool auth).
      allow.ownerDefinedIn('userUuid').identityClaim('sub'),
      // Server-side pipeline (ProcessDocument dispatcher + Step Functions Lambdas +
      // delete-document Lambda) calls AppSync directly with the API key and needs full CRUD.
      // TODO: migrate the backend pipeline to IAM auth so this grant can be tightened.
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("spaceUuid").sortKeys(["createdAt"]),
      index("userUuid").sortKeys(["createdAt"]),
    ]),
  DatalabRequest: a
    .model({
      requestId: a.string().required(),
      documentUuid: a.id().required(),
      taskUuid: a.id().required(),
      taskToken: a.string(),
      userUuid: a.id().required(),
      status: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['requestId'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid").sortKeys(["createdAt"]),
      index("userUuid").sortKeys(["createdAt"]),
    ]),
  Metadata: a
    .model({
      metadataUuid: a.id().required(),
      targetUuid: a.string().required(), // ID of the entity (documentUuid, chatUuid, etc.)
      targetType: a.string().required(), // Type of entity (e.g., 'document', 'chat', 'question', 'user')
      name: a.string().required(), // Metadata key/name
      value: a.string().required(), // Metadata value (stored as string)
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['metadataUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("targetUuid").sortKeys(["createdAt"]),
      index("targetType").sortKeys(["createdAt"]),
    ]),
  DocumentSummary: a
    .model({
      documentSummaryUuid: a.id().required(),
      documentUuid: a.id().required(),
      document: a.belongsTo("Document", ["documentUuid"]),
      title: a.string().required(),
      summary: a.string().required(),
      tags: a.string().required().array().required(),
      keyConcepts: a.string().required().array().required(),
      markdown: a.string(),
      enrichedMarkdown: a.string(),
      vote: a.enum(["up", "down"]),
      status: a.enum(["started", "streaming", "completed", "error"]),
    })
    .identifier(['documentSummaryUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid"),
    ]),
  DocumentVisionOutput: a
    .model({
      documentVisionOutputUuid: a.id().required(),
      documentUuid: a.id().required(),
      document: a.belongsTo("Document", ["documentUuid"]),
      totalPages: a.integer().required(),
      pageNumber: a.integer().required(),
      bbox: a.string().required(),
      className: a.string().required(),
      confidence: a.float().required(),
      caption: a.string(),
      text: a.string(),
    })
    .identifier(['documentVisionOutputUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid"),
    ]),
  DocumentContentBlock: a
    .customType({
      documentContentBlockUuid: a.id().required(),
      bbox: a.float().array().required(),
      content_type: a.string().required(),
      page_number: a.integer().required(),
      content_text: a.string(),
      visual_element_type: a.string(),
      visual_element_name: a.string(),
      visual_element_description: a.string(),
      visual_element_caption: a.string(),
    }),
  DocumentSection: a
    .model({
      documentSectionUuid: a.id().required(),
      documentUuid: a.id().required(),
      document: a.belongsTo("Document", ["documentUuid"]),
      documentType: a.string().required(),
      subject: a.string().required(),
      sectionName: a.string().required(),
      pageRange: a.string().required(),
      sectionSummary: a.string().required(),
      sectionKeyConcepts: a.string().required().array().required(),
      sectionContent: a.ref('DocumentContentBlock').array().required(),
    })
    .identifier(['documentSectionUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid"),
    ]),
  Task: a
    .model({
      taskUuid: a.id().required(),
      documentUuid: a.id(),
      messageUuid: a.id(),
      userUuid: a.id().required(),
      document: a.belongsTo("Document", ["documentUuid"]),
      status: a.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
      type: a.enum(["LAYOUT_DETECTION", "DOCUMENT_PROCESSING", "QUESTION_GENERATION", "FLASHCARD_GENERATION", "CHAT", "QUESTION_EXTRACT", "EXTRACT_MODULES", "EXTRACT_ANSWER_MODULES", "GENERATE_QUESTIONS"]),
      args: a.json(), // arguments for the task
      progress: a.integer().required(),
      error: a.string(),
      result: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['taskUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("documentUuid").sortKeys(["createdAt"]),
      index("userUuid").sortKeys(["createdAt"]),
      index("messageUuid").sortKeys(["createdAt"]),
    ]),
  ExtractedQuestionReference: a
    .customType({
      referenceType: a.enum(['none', 'image', 'graph', 'chart', 'table', 'passage']),
      page: a.integer().required(),
      boundingBox: a.float().array().required(),
      s3Key: a.string(), // S3 key for the uploaded reference image
      text: a.string(), // Text content for passages, tables, or JSON data for graphs/charts
    }),
  QuestionExtractJob: a
    .model({
      questionExtractJobUuid: a.id().required(),
      userUuid: a.id().required(), // Track who created the job (no filtering, just for reference)
      s3Key: a.string().required(), // S3 key for the uploaded file
      fileName: a.string().required(),
      fileType: a.string().required(), // pdf or image
      status: a.enum(["PENDING", "PROCESSING", "MODULES_EXTRACTED", "QUESTION_EXTRACTED", "COMPLETED", "FAILED"]),
      totalQuestions: a.integer(), // Count of extracted questions
      error: a.string(),
      extractionLogs: a.string(), // Markdown-formatted logs of extraction progress
      identifiedModules: a.string(), // JSON string of identified modules from Phase 1
      // Answer key fields
      answerKeyS3Key: a.string(), // S3 key for the answer key document
      answerKeyFileName: a.string(),
      answerKeyStatus: a.enum(["PENDING", "PROCESSING", "ANSWER_MODULES_EXTRACTED", "COMPLETED", "FAILED"]), // Track answer verification
      answerKeyError: a.string(),
      identifiedAnswerModules: a.string(), // JSON string of identified modules from answer key Phase 1
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['questionExtractJobUuid'])
    .authorization((allow) => [allow.publicApiKey()]),
  QuestionGenerationJob: a
    .model({
      questionGenerationJobUuid: a.id().required(),
      userUuid: a.id().required(), // Admin user who initiated the generation
      prompt: a.string().required(), // User's prompt for question generation
      status: a.enum(["PENDING", "GENERATING_QUESTIONS", "GENERATING_REFERENCES", "GENERATING_ANSWERS", "COMPLETED", "FAILED"]),
      totalQuestions: a.integer(), // Count of generated questions
      error: a.string(),
      generationLogs: a.string(), // Markdown-formatted logs of generation progress
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['questionGenerationJobUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
    ]),
  ExtractedQuestion: a
    .model({
      extractedQuestionUuid: a.id().required(),
      questionExtractJobUuid: a.id(), // For extracted questions
      questionGenerationJobUuid: a.id(), // For generated questions
      moduleNumber: a.integer().required(), // Module number within the exam (e.g., 1 for Module 1, 2 for Module 2)
      questionNumber: a.integer().required(), // Question number within the module (e.g., 1, 2, 3, ...)
      questionContent: a.string().required(),
      questionType: a.enum(['MULTIPLE_CHOICE', 'TEXT_INPUT']),
      questionOptions: a.string().required().array(), // Empty array for TEXT_INPUT, 4 options for MULTIPLE_CHOICE
      correctAnswer: a.string(), // For MULTIPLE_CHOICE: "A", "B", "C", or "D". For TEXT_INPUT: the answer string
      answerExplanations: a.string().array(), // Array of 4 explanations for all answer choices (A, B, C, D order), empty strings if not available
      hint: a.string(), // Hint for solving the question
      questionReference: a.ref('ExtractedQuestionReference'),
      referenceExtractionStatus: a.enum(['EXTRACTING', 'EXTRACTED', 'FAILED']), // Track reference extraction progress
      referenceExtractionError: a.string(), // Error message if reference extraction failed
      // For generated questions
      needsReference: a.boolean(), // Whether this generated question requires a reference
      referenceGenerationPrompt: a.string(), // Prompt for AI to generate the reference
      needsCodeInterpreterForAnswer: a.boolean(), // Whether solving requires Python calculations
      // Metadata
      exam: a.string().required(), // e.g., "SAT"
      module: a.string().required(), // e.g., "Math", "Reading and Writing"
      topic: a.string(), // e.g., "Algebra", "Advanced Math"
      subtopic: a.string(), // e.g., "Linear equations", "Quadratic equations"
      concept: a.string(), // e.g., "Solving for x", "Factoring"
      difficulty: a.enum(['EASY', 'MEDIUM', 'HARD']), // Difficulty level assessed by AI
      examModuleUuid: a.id(), // Link to ExamModule for categorization (e.g., "SAT Math", "SAT Free")
      verified: a.boolean(), // Whether the question has been manually verified
      verifiedAt: a.datetime(), // When the question was verified
      verifiedBy: a.id(), // User who verified the question
      isGenerated: a.boolean(), // Whether the question was generated by the AI
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['extractedQuestionUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("questionExtractJobUuid").sortKeys(["moduleNumber", "questionNumber"]),
      index("questionGenerationJobUuid").sortKeys(["createdAt"]),
      index("examModuleUuid").sortKeys(["createdAt"]),
    ]),
  FlashcardReference: a
    .customType({
      reference_type: a.string(),
      reference_name: a.string(),
      reference_content: a.string(),
      reference_url: a.string(),
    }),
  FlashcardItem: a
    .customType({
      flashcardUuid: a.id().required(),
      title: a.string().required(),
      content: a.string().required(),
      references: a.ref('FlashcardReference').array(),
      vote: a.enum(["up", "down"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    }),
  FlashcardDeck: a
    .model({
      flashcardDeckUuid: a.id().required(),
      userUuid: a.id().required(),
      title: a.string(),
      description: a.string(),
      flashcards: a.ref('FlashcardItem').array().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['flashcardDeckUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
    ]),
  Flashcard: a
    .model({
      flashcardUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      documentUuid: a.id(),
      chatUuid: a.id(),
      title: a.string().required(),
      content: a.string().required(),
      references: a.ref('FlashcardReference').array(),
      vote: a.enum(["up", "down"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['flashcardUuid', 'createdAt'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
      index("documentUuid").sortKeys(["createdAt"]),
      index("chatUuid").sortKeys(["createdAt"]),
    ]),
  QuestionReference: a
    .customType({
      reference_type: a.string(),
      reference_name: a.string(),
      reference_content: a.string(),
      reference_url: a.string(),
    }),
  Question: a
    .model({
      questionUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      documentUuid: a.id(),
      document: a.belongsTo("Document", ["documentUuid"]),
      chatUuid: a.id(),
      questionContent: a.string().required(),
      questionReferences: a.ref('QuestionReference').array(),
      options: a.string().array().required(),
      answer: a.integer().required(),
      hint: a.string(),
      answerExplanations: a.string().array(),
      vote: a.enum(["up", "down"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['questionUuid', 'createdAt'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("documentUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
      index("chatUuid").sortKeys(["createdAt"]),
    ]),
  BatchJobInfo: a
    .customType({
      name: a.string().required(),
      jobType: a.string().required(),
      description: a.string().required(),
    }),
  MockExamInfo: a
    .customType({
      description: a.string().required(),
      topic: a.string().required(),
      difficulty: a.string().required(),
      time: a.integer().required(),
      questionCount: a.integer().required(),
      instructions: a.string().required(),
      moduleUuids: a.string().required().array(),
    }),
  MockExamQuestionReference: a
    .customType({
      referenceType: a.enum(["image", "text", "table"]),
      text: a.string(),
      externalKey: a.string(), // this is an S3 key for images
    }),
  MockExamQuestion: a
    .customType({
      index: a.integer().required(),
      questionContent: a.string().required(),
      options: a.string().array().required(),
      answer: a.integer().required(),
      hint: a.string(),
      answerExplanations: a.string().array(),
      vote: a.enum(["up", "down"]),
      questionReference: a.ref('MockExamQuestionReference').array(),
      concept: a.string(), // SAT concept ID (e.g., "sat-math-algebra-linear-equations")
      subtopic: a.string(), // Display name for backward compatibility
    }),
  MockExam: a
    .model({
      mockExamUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      chatUuid: a.id().required(),
      title: a.string().required(),
      examName: a.string(), // e.g., "SAT Assessment", "Practice Test 1"
      mockExamInfo: a.ref('MockExamInfo').required(),
      questions: a.ref('MockExamQuestion').array(),
      creationStatus: a.enum(["CREATED", "GENERATING", "GENERATED", "FAILED"]),
      mockExamLogs: a.hasMany("MockExamLog", ["mockExamUuid"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['mockExamUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
      index("examName").sortKeys(["createdAt"]),
    ]),
  QuestionAnswer: a
    .customType({
      index: a.integer().required(),
      givenAnswer: a.integer(),
      answerTimeInMilliseconds: a.integer(), // time the user took to answer the question
      answerAt: a.datetime(), // date and time the user answered the question
      chatUuid: a.string(),
    }),
  MockExamLog: a
    .model({
      mockExamLogUuid: a.id().required(),
      mockExamUuid: a.id().required(),
      mockExam: a.belongsTo("MockExam", ["mockExamUuid"]),
      questionAnswers: a.ref('QuestionAnswer').array().required(),
      status: a.enum(["IN_PROGRESS", "COMPLETED"]),
      score: a.integer().required(),
      startedAt: a.datetime().required(),
      completedAt: a.datetime(),
      createdAt: a.datetime().required(), // createdAt and startedAt might be similar at this time
      updatedAt: a.datetime().required(), // updatedAt and completedAt might be similar at this time
    })
    .identifier(['mockExamLogUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("mockExamUuid").sortKeys(["startedAt"]),
      index("mockExamUuid").sortKeys(["completedAt"]),
    ]),
  // SAT MINI Exam Structure
  SATMiniQuestionReference: a
    .customType({
      referenceType: a.string().required(), // "none", "image", "graph", "chart", "table", "passage"
      externalKey: a.string(), // S3 key for images
      text: a.string(), // Text content for passages, tables, or JSON data for graphs/charts
    }),
  SATMiniQuestion: a
    .customType({
      questionId: a.string().required(), // Reference to question bank ID
      questionContent: a.string().required(),
      options: a.string().array().required(),
      correctAnswer: a.integer().required(), // Index of correct answer
      hint: a.string(),
      answerExplanations: a.string().array(),
      questionReference: a.ref('SATMiniQuestionReference').array(),
      concept: a.string().required(), // SAT concept ID
      subtopic: a.string().required(), // Display name
      difficulty: a.enum(["easy", "medium", "hard"]),
      givenAnswer: a.integer(), // User's answer (index)
    }),
  SATMiniModule: a
    .customType({
      moduleNumber: a.integer().required(), // 1, 2, 3, or 4
      moduleType: a.enum(["reading_writing", "math"]),
      difficulty: a.enum(["easy_medium", "medium_hard"]), // Adaptive difficulty for modules 3 & 4
      questions: a.ref('SATMiniQuestion').array().required(),
      correctCount: a.integer().required(),
      totalQuestions: a.integer().required(),
      score: a.integer(), // Weighted score for this module
    }),
  SATMiniExamLog: a
    .model({
      satMiniExamLogUuid: a.id().required(),
      userUuid: a.id().required(),

      // Exam metadata
      status: a.enum(["IN_PROGRESS", "COMPLETED"]),
      startedAt: a.datetime().required(),
      completedAt: a.datetime(),

      // Module data (4 modules total)
      modules: a.ref('SATMiniModule').array().required(),

      // Overall scores
      totalCorrect: a.integer().required(),
      totalQuestions: a.integer().required(),
      predictedSATScore: a.integer().required(), // 400-1600

      // Subject scores
      readingWritingScore: a.integer(), // 200-800
      mathScore: a.integer(), // 200-800

      // Performance by concept (for learning profile updates)
      conceptPerformance: a.json(), // Map of concept -> { correct, total }

      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['satMiniExamLogUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["startedAt"]),
      index("userUuid").sortKeys(["completedAt"]),
    ]),
  QuizQuestion: a
    .model({
      quizQuestionUuid: a.id().required(),
      userUuid: a.id().required(),

      quizUuid: a.id().required(),
      quiz: a.belongsTo("Quiz", ["quizUuid"]),

      sourceType: a.enum(["document", "chat"]),
      sourceUuid: a.id().required(),

      questionContent: a.string().required(),
      questionReferences: a.ref('QuestionReference').array(),

      options: a.string().array().required(), // the correct answer MUST be the first option
      hint: a.string(),
      answerExplanations: a.string().array(),

      vote: a.enum(["up", "down"]),
    })
    .identifier(['quizQuestionUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid"),
      index("quizUuid"),
      index("sourceUuid"),
    ]),
  Quiz: a
    .model({
      quizUuid: a.id().required(),
      userUuid: a.id().required(),

      state: a.enum(["generating", "completed", "failed"]),

      title: a.string(),
      description: a.string(),
      difficulty: a.string(),

      sourceType: a.enum(["document", "chat"]),
      sourceUuid: a.id().required(),

      document: a.belongsTo("Document", ["sourceUuid"]),
      chat: a.belongsTo("Chat", ["sourceUuid"]),

      // Ordered list of included Question IDs
      questionCount: a.integer().required(),
      quizQuestions: a.hasMany("QuizQuestion", ["quizUuid"]),

      // Store last score on the quiz
      attempts: a.hasMany("QuizAttempt", ["quizUuid"]),

      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['quizUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("sourceUuid").sortKeys(["createdAt"]),
    ]),
  QuizAttempt: a
    .model({
      quizAttemptUuid: a.id().required(),
      userUuid: a.id().required(),

      quizUuid: a.id().required(),
      quiz: a.belongsTo("Quiz", ["quizUuid"]),

      score: a.integer().required(),
      total: a.integer().required(),

      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['quizAttemptUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("quizUuid").sortKeys(["createdAt"]),
    ]),
  Chat: a
    .model({
      chatUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      documentUuid: a.id(),
      document: a.belongsTo("Document", ["documentUuid"]),
      space: a.belongsTo("Space", ["spaceUuid"]),
      messages: a.hasMany("Message", ["chatUuid"]),
      name: a.string(),

      hideInRecent: a.boolean(),
      titleChangedByTheUser: a.boolean(),

      isWebSearchCalled: a.boolean(),
      hasFlashcardsOrQuizzes: a.boolean(),
      flashcardDeckUuid: a.id(),
      quizzes: a.hasMany("Quiz", ["sourceUuid"]),

      citations: a.hasMany("ChatCitation", ["chatUuid"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['chatUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("documentUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
    ]),
  ChatCitation: a
    .model({
      chatCitationUuid: a.id().required(),
      chatUuid: a.id().required(),
      messageUuid: a.id().required(),
      message: a.belongsTo("Message", ["messageUuid"]),
      chat: a.belongsTo("Chat", ["chatUuid"]),
      type: a.string().required(),
      title: a.string().required(),
      url: a.string().required(),
      startIndex: a.integer().required(),
      endIndex: a.integer().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['chatCitationUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("chatUuid").sortKeys(["createdAt"]),
    ]),
  MessageToolExtra: a.
    customType({
      userAction: a.boolean(),
      isLoading: a.boolean(),
      success: a.boolean(),
      errors: a.json(),
    }),
  Message: a
    .model({
      messageUuid: a.id().required(),
      chatUuid: a.id().required(),
      content: a.string().required(),
      image: a.string(),
      role: a.enum(["user", "assistant"]),
      citations: a.hasMany("ChatCitation", ["messageUuid"]),
      type: a.enum(["text", "tool"]),
      toolName: a.string(),
      toolArguments: a.json(),
      toolExtras: a.ref("MessageToolExtra"),
      chat: a.belongsTo("Chat", ["chatUuid"]),
      isCompleted: a.boolean(),
      vote: a.enum(["up", "down"]),
      agentStatus: a.enum(["thinking", "understanding", "generating", "searching_web"]),
      agentStatusMessage: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['messageUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("chatUuid").sortKeys(["createdAt"]),
    ]),
  FlashcardGameFlashcard: a
    .customType({
      flashcardUuid: a.id().required(),
      documentUuid: a.id(),
      title: a.string().required(),
      content: a.string().required(),
    }),
  FlashcardGame: a
    .model({
      flashcardGameUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      title: a.string().required(),
      description: a.string().required(),
      progress: a.integer().required(),
      score: a.integer().required(),
      flashcards: a.ref('FlashcardGameFlashcard').array().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['flashcardGameUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
    ]),
  YoutubeVideo: a
    .model({
      youtubeVideoUuid: a.id().required(),
      documents: a.hasMany("Document", ["youtubeVideoUuid"]),
      videoId: a.string().required(),
      title: a.string().required(),
      transcriptKey: a.string().required(),
      thumbnailUrl: a.string().required(),
      userRequests: a.hasMany("UserRequest", ["youtubeVideoUuid"]),
    })
    .identifier(['youtubeVideoUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("videoId"),
    ]),
  ExamPaper: a
    .model({
      examPaperUuid: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      examType: a.string(),
      totalQuestions: a.integer().required(),
      documentUuid: a.id().required(),
      userUuid: a.id().required(),
      spaceUuid: a.id(),
      paperIndex: a.integer().required(),
      document: a.belongsTo("Document", ["documentUuid"]),
      space: a.belongsTo("Space", ["spaceUuid"]),
      questions: a.hasMany("ExamPaperQuestion", ["examPaperUuid"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['examPaperUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("userUuid").sortKeys(["createdAt"]),
      index("documentUuid").sortKeys(["createdAt"]),
      index("spaceUuid").sortKeys(["createdAt"]),
    ]),
  ExamPaperQuestionReference: a
    .customType({
      referenceType: a.enum(["image", "text", "table"]),
      page: a.integer().required(),
      boundingBox: a.float().array(),
      text: a.string(),
      externalKey: a.string(), // this will be an S3 key for images
    }),
  ExamPaperQuestion: a
    .model({
      examPaperQuestionUuid: a.id().required(),
      examPaperUuid: a.id().required(),
      examPaper: a.belongsTo("ExamPaper", ["examPaperUuid"]),

      moduleUuid: a.id().required(),

      // Question data
      questionNumber: a.string().required(),
      questionContent: a.string().required(),
      questionOptions: a.string().array().required(),
      questionType: a.string().required(),
      questionHint: a.string().required(),
      questionAnswerExplanations: a.string().array().required(),
      questionReference: a.ref('ExamPaperQuestionReference').array(), // JSON object for reference data
      moduleName: a.string(),
      moduleNumber: a.integer(),
      questionExamName: a.string(), // e.g. SAT, GRE, TOEFL, etc.
      questionExamSubject: a.string(), // e.g. Math, English, Biology, Chemistry, Physics, etc.
      questionTopic: a.string(), // e.g. Trigonometry, Organic Chemistry, etc.
      difficultyLevel: a.enum(['easy', 'medium', 'hard']),
      verified: a.boolean().required(), // default false
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['examPaperQuestionUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("examPaperUuid").sortKeys(["questionNumber"]),
      index("moduleUuid").sortKeys(["createdAt"]),
    ]),
  File: a
    .customType({
      s3Key: a.string().required(),
    }),
  aiCallResponse: a
    .customType({
      success: a.boolean().required(),
      errorCode: a.integer(),
      error: a.string(),
      quizUuid: a.id(),
    }),
  aiChat: a
    .query()
    .arguments({
      chatUuid: a.id().required(),
      userUuid: a.id().required(),
      message: a.string().required(),
      messageUuid: a.id().required(),
      image: a.string(),
      taskUuid: a.id().required(),
      chatType: a.enum(["main", "question", "mock_exam", "document"]),
      chatArgs: a.json().required(),
    })
    .returns(a.ref('aiCallResponse'))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  moveDocument: a
    .mutation()
    .arguments({
      documentUuid: a.id().required(),
      spaceUuid: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  moveChat: a
    .mutation()
    .arguments({
      chatUuid: a.id().required(),
      spaceUuid: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  moveAllUserResources: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
      spaceUuid: a.id().required(),
    })
    .returns(a.customType({
      documentsMoved: a.integer().required(),
      chatsMoved: a.integer().required(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  deleteDocument: a
    .query()
    .arguments({
      documentUuid: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  deleteChat: a
    .query()
    .arguments({
      chatUuid: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoLight)),
  deleteUser: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      message: a.string(),
    }))
    .authorization((allow) => [
      allow.authenticated(),
    ])
    .handler(a.handler.function(honoHeavy)),
  FeatureFlag: a
    .customType({
      flagName: a.string().required(),
      flagValue: a.enum(["active", "inactive", "admin_only"]),
    }),
  UserSummary: a
    .customType({
      userId: a.id().required(),
      email: a.string().required(),
      givenName: a.string(),
      familyName: a.string(),
      enabled: a.boolean().required(),
      status: a.string(),
    }),
  AppSettings: a
    .model({
      appSettingsUuid: a.id().required(),
      featureFlags: a.ref('FeatureFlag').array().required(),
      maintenanceMessage: a.string(),
      memoryFeatureEnabled: a.boolean(), // Global kill switch for Persistent Memory
    })
    .identifier(['appSettingsUuid'])
    .authorization((allow) => [allow.publicApiKey()]),
  Bundle: a
    .model({
      bundleUuid: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      order: a.integer().required(),
      defaultSku: a.string(),
      additionalSkus: a.string().array(),
      modules: a.string().array().required(), // these are the module uuids
      published: a.boolean().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      publishedAt: a.datetime(),
      createdBy: a.id(),
      updatedBy: a.id(),
    })
    .identifier(['bundleUuid'])
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete']),
    ])
    .secondaryIndexes((index) => [
      index("defaultSku"),
    ]),
  Receipt: a
    .model({
      receiptId: a.id().required(),
      userId: a.id().required(),
      provider: a.enum(['manual', 'stripe', 'paddle', 'google', 'apple', 'other', 'flylane']),
      payload: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['receiptId'])
    .authorization((allow) => [
      // NO publicApiKey access - receipts are sensitive data
      allow.groups(['admin']).to(['create', 'read', 'update', 'delete']),
    ]),
  Purchase: a
    .model({
      userId: a.id().required(),
      bundleUuid: a.id().required(),
      purchasedAt: a.datetime().required(),
      source: a.enum(['manual', 'stripe', 'paddle', 'google', 'apple', 'other', 'flylane']),
      receiptId: a.id(),
      revokedAt: a.datetime(),
      revokedBy: a.id(),
      revokeReason: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['userId', 'bundleUuid'])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete']),
    ])
    .secondaryIndexes((index) => [
      index('bundleUuid').sortKeys(["purchasedAt"]),
      index('userId').sortKeys(["purchasedAt"]),
    ]),
  ExamModule: a
    .model({
      examModuleUuid: a.id().required(),
      moduleName: a.string().required(),
      questionKeys: a.string().required().array(),
      price: a.integer().required(),
      retired: a.boolean().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['examModuleUuid'])
    .authorization((allow) => [allow.publicApiKey()]),
  CurioSubscription: a
    .model({
      subscriptionId: a.id().required(),
      userId: a.id().required(),
      provider: a.enum(['paddle', 'stripe', 'apple', 'google', 'manual', 'partnership', 'flylane']),
      status: a.enum(['active', 'paused', 'cancelled', 'past_due', 'trialing']),
      tier: a.enum(['super', 'ultra']),
      providerSubscriptionId: a.string(),
      providerCustomerId: a.string(),
      currentPeriodStart: a.datetime(),
      currentPeriodEnd: a.datetime(),
      cancelledAt: a.datetime(),
      pausedAt: a.datetime(),
      nextBillingDate: a.datetime(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['subscriptionId'])
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete']),
    ])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']),
    ]),
  Partnership: a
    .model({
      partnershipUuid: a.id().required(),
      partnerName: a.string().required(),
      partnerCode: a.string().required(),
      logoS3Key: a.string(),
      futureUsers: a.hasMany("FutureUser", ["partnershipUuid"]),
      priceRecordOverrides: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['partnershipUuid'])
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
    ])
    .secondaryIndexes((index) => [
      index('partnerCode'),
    ]),
  FutureUser: a
    .model({
      futureUserUuid: a.id().required(),
      email: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      partnershipUuid: a.id(),
      partnership: a.belongsTo("Partnership", ["partnershipUuid"]),
      subStartDate: a.datetime(),
      subEndDate: a.datetime(),
      receiptPayload: a.json(),
      provider: a.enum(['paddle', 'stripe', 'apple', 'google', 'manual', 'partnership', 'flylane']),
      tier: a.enum(['super', 'ultra']),
      subscriptionGranted: a.boolean(), // Whether subscription has been granted
      subscriptionGrantedAt: a.datetime(), // When subscription was granted
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['futureUserUuid'])
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
    ])
    .secondaryIndexes((index) => [
      index('email'),
      index('partnershipUuid').sortKeys(['createdAt']),
    ]),
  // TopicSubtopicConcept model removed - now using Neptune graph database
  // Old model kept for reference but commented out
  // TopicSubtopicConcept: a
  //   .model({
  //     topic: a.string().required(),
  //     subtopic: a.string().required(),
  //     concept: a.string().required(),
  //     topicDisplay: a.string().required(),
  //     subtopicDisplay: a.string().required(),
  //     conceptDisplay: a.string().required(),
  //     tag: a.string(), // e.g., 'SAT' for SAT-specific concepts
  //     createdAt: a.datetime().required(),
  //     updatedAt: a.datetime().required(),
  //   })
  //   .identifier(['topic', 'subtopic', 'concept'])
  //   .authorization((allow) => [
  //     allow.publicApiKey().to(['read']),
  //     allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
  //   ])
  //   .secondaryIndexes((index) => [
  //     index('topic').sortKeys(['subtopic', 'concept']),
  //     index('subtopic').sortKeys(['concept']),
  //     index('tag').sortKeys(['concept']),
  //   ]),
  // UserLearningProfile model removed - now using Neptune DB for learning profile
  // Keeping UserLearningProfileHistory for historical tracking
  MasteryChange: a
    .customType({
      oldValue: a.integer().required(),
      newValue: a.integer().required(),
    }),
  UserLearningProfileHistory: a
    .model({
      userLearningProfileHistoryUuid: a.id().required(),
      userUuid: a.id().required(),
      concept: a.string().required(),
      change: a.ref('MasteryChange').required(),
      createdAt: a.datetime().required(),
    })
    .identifier(['userLearningProfileHistoryUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index('userUuid').sortKeys(['createdAt']),
      index('concept').sortKeys(['createdAt']),
    ]),
  MemoryBlock: a
    .model({
      memoryBlockUuid: a.id().required(),
      ownerUuid: a.id().required(),
      scope: a.enum(['user', 'folder', 'file', 'system']),
      scopeId: a.id().required(),
      blockType: a.string().required(),
      payload: a.json().required(),
      topic: a.string().required(),
      subject: a.string(),
      documentUuid: a.id(),
      confidence: a.float().required(),
      frequency: a.integer().required(),
      attemptScores: a.float().array(),
      attemptDates: a.datetime().array(),
      firstSeenAt: a.datetime().required(),
      lastReinforcedAt: a.datetime().required(),
      version: a.integer().required(),
      sources: a.string().array(),
      addedFrom: a.enum(['chat', 'quiz', 'mock_exam', 'flashcard']),
      isBackfill: a.boolean(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .identifier(['memoryBlockUuid'])
    .authorization((allow) => [
      allow.ownerDefinedIn('ownerUuid').identityClaim('sub'),
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index('ownerUuid').sortKeys(['updatedAt']),
      index('ownerUuid').sortKeys(['blockType', 'updatedAt']),
    ]),
  MemoryCandidate: a
    .model({
      memoryCandidateUuid: a.id().required(),
      ownerUuid: a.id().required(),
      scope: a.enum(['user', 'folder', 'file', 'system']),
      scopeId: a.id().required(),
      proposedBlock: a.json().required(),
      decision: a.enum(['created', 'merged', 'rejected']),
      mergedIntoUuid: a.id(),
      messageUuid: a.id(),
      chatUuid: a.id(),
      createdAt: a.datetime().required(),
    })
    .identifier(['memoryCandidateUuid'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index('ownerUuid').sortKeys(['createdAt']),
      index('scopeId').sortKeys(['createdAt']),
    ]),
  BatchProcess: a
    .model({
      processId: a.id().required(),
      jobType: a.string().required(),
      jobName: a.string(), // Human-readable name from creator definition
      state: a.enum(['creating', 'mutating', 'complete']),
      failed: a.boolean().required(),
      startTime: a.datetime().required(),
      completionTime: a.datetime(),
      totalJobs: a.integer().required(),
      completedJobs: a.integer().required(),
      failedJobs: a.integer().required(),
      ttl: a.integer(), // Unix timestamp for DynamoDB TTL (1 week)
    })
    .identifier(['processId'])
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("state").sortKeys(["startTime"]),
    ]),
  mockExamsGenerateQuestions: a
    .query()
    .arguments({
      mockExamUuid: a.id().required(),
      userUuid: a.id().required(),
      taskUuid: a.id().required(),
    })
    .returns(a.ref('aiCallResponse'))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  adminSearchUsers: a
    .query()
    .arguments({
      email: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      users: a.ref('UserSummary').array().required(),
    }))
    .authorization((allow) => [allow.groups(['admin'])])
    .handler(a.handler.function(honoLight)),
  fulfillPurchase: a
    .query()
    .arguments({
      sku: a.string().required(),
      userId: a.id().required(),
      provider: a.enum(['manual', 'stripe', 'paddle', 'google', 'apple', 'other', 'flylane']),
      receiptPayload: a.string(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      bundleUuid: a.id(),
      receiptId: a.id(),
      warning: a.string(),
    }))
    .authorization((allow) => [allow.publicApiKey()]) // Webhook can call this
    .handler(a.handler.function(honoLight)),
  extractQuestionReferences: a
    .mutation()
    .arguments({
      questionExtractJobUuid: a.id().required(),
      questionUuids: a.id().array(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      processedCount: a.integer().required(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  satExtractAnswers: a
    .mutation()
    .arguments({
      questionExtractJobUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      matchedCount: a.integer().required(),
      error: a.string(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  batchCreator: a
    .mutation()
    .arguments({
      jobType: a.string().required(),
      jobName: a.string(), // Optional: human-readable name from creator definition
    })
    .returns(a.customType({
      success: a.boolean().required(),
      jobType: a.string(),
      jobsQueued: a.integer(),
      jobs: a.ref('BatchJobInfo').array(),
      error: a.string(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  embedSpaceFlashcards: a
    .mutation()
    .arguments({
      spaceUuid: a.string().required(),
      userUuid: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      embedded: a.integer(),
      error: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(honoHeavy)),
  enqueueMemoryEvent: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
      payload: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      skipped: a.boolean(),
    }))
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
    .handler(a.handler.function(honoLight)),
  clearUserMemory: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      deletedCount: a.integer().required(),
    }))
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
    .handler(a.handler.function(honoLight)),
  exportLearningProfile: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      downloadUrl: a.string(),
      filename: a.string(),
      error: a.string(),
    }))
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
    .handler(a.handler.function(honoLight)),
  runMemoryBackfill: a
    .mutation()
    .arguments({
      userUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      skipped: a.boolean(),
      gapsCreated: a.integer(),
      masteredCreated: a.integer(),
    }))
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
    .handler(a.handler.function(honoLight)),
  generateQuestions: a
    .mutation()
    .arguments({
      questionGenerationJobUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      questionsGenerated: a.integer().required(),
      questionsNeedingReferences: a.integer().required(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  generateQuestionReference: a
    .mutation()
    .arguments({
      extractedQuestionUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      s3Key: a.string(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  generateQuestionAnswer: a
    .mutation()
    .arguments({
      extractedQuestionUuid: a.id().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  // Consolidated Knowledge Base Operations
  // Single query and mutation that handle all operations via actionType
  // The lambda will validate required fields based on actionType
  // Query actionTypes: 'listSubjects', 'listTopics', 'listConcepts', 'listTerms', 'listExams', 'listConceptsByExam'
  knowledgeBaseQuery: a
    .query()
    .arguments({
      actionType: a.string().required(), // Determines which operation to perform
      subject: a.ref('SubjectInput'),
      topic: a.ref('TopicInput'),
      concept: a.ref('ConceptInput'),
      term: a.ref('TermInput'),
      exam: a.ref('ExamInput'),
      // Filter fields for list operations
      subjectId: a.string(), // for listTopics
      topicId: a.string(), // for listConcepts
      conceptId: a.string(), // for listTerms
      examId: a.string(), // for listConceptsByExam
    })
    .returns(a.customType({
      success: a.boolean().required(),
      subjectsList: a.ref('SubjectListItem').array(),
      subjectItem: a.ref('Subject'),
      topics: a.ref('TopicListItem').array(),
      topic: a.ref('Topic'),
      concepts: a.ref('ConceptListItem').array(),
      concept: a.ref('Concept'),
      terms: a.ref('Term').array(),
      term: a.ref('Term'),
      exams: a.ref('Exam').array(),
      exam: a.ref('Exam'),
    }))
    .authorization((allow) => [allow.publicApiKey(), allow.groups(['admin'])])
    .handler(a.handler.function(honoHeavy)),
  // Mutation actionTypes: 'createSubject', 'updateSubject', 'deleteSubject', 'createTopic', 'updateTopic', 'deleteTopic',
  // 'createConcept', 'updateConcept', 'deleteConcept', 'createTerm', 'updateTerm', 'deleteTerm',
  // 'createExam', 'updateExam', 'deleteExam', 'linkConceptToExam', 'unlinkConceptFromExam'
  // The lambda will validate required fields based on actionType (e.g., createSubject requires subject.id and subject.displayName)
  knowledgeBaseMutation: a
    .mutation()
    .arguments({
      actionType: a.string().required(), // Determines which operation to perform
      subject: a.ref('SubjectInput'),
      topic: a.ref('TopicInput'),
      concept: a.ref('ConceptInput'),
      term: a.ref('TermInput'),
      exam: a.ref('ExamInput'),
      // For link/unlink operations
      conceptId: a.string(), // for linkConceptToExam, unlinkConceptFromExam
      examId: a.string(), // for linkConceptToExam, unlinkConceptFromExam
    })
    .returns(a.customType({
      success: a.boolean().required(),
      subjectItem: a.ref('Subject'),
      topic: a.ref('Topic'),
      concept: a.ref('Concept'),
      term: a.ref('Term'),
      exam: a.ref('Exam'),
      message: a.string(), // For operations like deleteAllNodes
    }))
    .authorization((allow) => [allow.publicApiKey(), allow.groups(['admin'])])
    .handler(a.handler.function(honoHeavy)),
  // Learning Profile Operations
  // Consolidated Learning Profile Operations
  // Single query and mutation that handle all operations via actionType
  // The lambda will validate required fields based on actionType
  // Query actionTypes: 'getUserLearningProfile', 'getConceptMastery', 'getSubjectMastery', 'getTopicMastery'
  learningProfileQuery: a
    .query()
    .arguments({
      actionType: a.string().required(), // Determines which operation to perform
      userUuid: a.id().required(),
      conceptId: a.string(), // for getConceptMastery
      subjectId: a.string(), // for getSubjectMastery
      topicId: a.string(), // for getTopicMastery
    })
    .returns(a.customType({
      success: a.boolean().required(),
      conceptMasteries: a.ref('ConceptMastery').array(),
      conceptsMastery: a.ref('ConceptWithHierarchy').array(),
      conceptId: a.string(),
      subjectId: a.string(),
      topicId: a.string(),
      masteryLevel: a.integer(),
      lastPracticedAt: a.string(),
      practiceCount: a.integer(),
      createdAt: a.string(),
      updatedAt: a.string(),
      concept: a.string(), // for createOrUpdateConceptMastery return
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  // Mutation actionTypes: 'createOrUpdateConceptMastery', 'batchUpdateConceptMastery', 'deleteUserKnowledge'
  // The lambda will validate required fields based on actionType
  learningProfileMutation: a
    .mutation()
    .arguments({
      actionType: a.string().required(), // Determines which operation to perform
      userUuid: a.id().required(),
      concept: a.string(), // for createOrUpdateConceptMastery
      masteryLevel: a.integer(), // for createOrUpdateConceptMastery
      updates: a.ref('LearningProfileUpdate').array(), // for batchUpdateConceptMastery
      email: a.string(),
      firstName: a.string(),
      lastName: a.string(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      concept: a.string(),
      masteryLevel: a.integer(),
      lastPracticedAt: a.string(),
      practiceCount: a.integer(),
      createdAt: a.string(),
      updatedAt: a.string(),
      updatedCount: a.integer(), // for batchUpdateConceptMastery
      message: a.string(), // for deleteUserKnowledge
    }))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(honoHeavy)),
  // Create default knowledge base nodes from DEFAULT_TOPICS
  createDefaultKnowledgeBaseNodes: a
    .mutation()
    .returns(a.customType({
      success: a.boolean().required(),
      message: a.string(),
      counts: a.customType({
        subjects: a.integer().required(),
        topics: a.integer().required(),
        concepts: a.integer().required(),
        exams: a.integer().required(),
      }),
    }))
    .authorization((allow) => [allow.publicApiKey(), allow.groups(['admin'])])
    .handler(a.handler.function(honoHeavy)),
})
  .authorization((allow) => [
    allow.resource(queryRagLambda),
    allow.resource(subscriptionUpdate),
    allow.resource(transactionCompleted),
    allow.resource(satQuestionExtractor),
    allow.resource(satExtractModules),
    allow.resource(satExtractAnswerModules),
    allow.resource(fixQuestionConcepts),
    allow.resource(postAuthentication),
    allow.resource(postConfirmation),
    allow.resource(extractAndEmbedLambda),
    // Standalone embedSpaceFlashcards Lambda — still invoked async by moveDocument (P3-2).
    allow.resource(embedSpaceFlashcards),
    allow.resource(processDocumentUpdateTaskStatus),
    allow.resource(processDocumentCreateSummary),
    allow.resource(processDocumentCreateFlashcards),
    allow.resource(processDocumentCategorise),
    allow.resource(processDocumentDatalabSubmit),
    allow.resource(processDocumentDatalabRetrieve),
    allow.resource(processDocumentFileTypeDetection),
    allow.resource(batchMutator),
    allow.resource(qdrantExportMutator),
    allow.resource(retrieveDatalabQuery),
    allow.resource(processDocumentDatalabWaitForToken),
    allow.resource(mergeDuplicateUser),
    allow.resource(memoryReflection),
    // Phase 5 — 26 GraphQL ops consolidated into 3 Hono Lambdas.
    allow.resource(honoLight),
    allow.resource(honoHeavy),
  ])

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
