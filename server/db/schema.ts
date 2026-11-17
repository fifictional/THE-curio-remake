/**
 * Postgres schema — the chat slice of the old DynamoDB models.
 *
 * Ported from `amplify/data/resource.ts` in the old repo. Only the tables v0
 * needs: users, spaces, documents, chats, messages, flashcards, questions.
 *
 * Rules applied from docs/adr/0002:
 *   - UUID primary keys (the old schemas already had them)
 *   - timestamptz, not strings
 *   - real foreign keys with explicit ON DELETE behaviour
 *   - userUuid kept on every table so row-level security needs no joins
 *   - the embedded objects from Dynamo become `jsonb` when they arrive
 *
 * Deliberate simplification: the old `Flashcard`/`Question` composite primary
 * keys `(uuid, createdAt)` become a single PK + an index. Dynamo needed the
 * sort key; Postgres does not.
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const messageRole = pgEnum('message_role', ['user', 'assistant']);
export const messageType = pgEnum('message_type', ['text', 'tool']);

/* -------------------------------------------------------------------------- */
/* users                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Identity table — Better Auth's `user` model.
 *
 * Two deliberate choices:
 *   - the primary-key PROPERTY is `id` because Better Auth requires it; the
 *     physical column stays `user_uuid` so existing data keeps its ids.
 *     (This is the "migrate users" story: a Cognito `sub` becomes the auth id.)
 *   - `name` replaces firstName/lastName, which is all Better Auth stores.
 */
export const users = pgTable('users', {
  id: uuid('user_uuid').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  // Profile fields that only exist in the DynamoDB UserProfile rows.
  firstName: text('first_name'),
  lastName: text('last_name'),
  country: text('country'),
  userDescription: text('user_description'),
  userHelp: text('user_help'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  onboardingSkipped: boolean('onboarding_skipped').notNull().default(false),
  memoryDisabled: boolean('memory_disabled').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Better Auth tables (session / account / verification)                      */
/* -------------------------------------------------------------------------- */

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('accounts_user_idx').on(t.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* spaces (folders)                                                           */
/* -------------------------------------------------------------------------- */

export const spaces = pgTable(
  'spaces',
  {
    spaceUuid: uuid('space_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('spaces_user_idx').on(t.userUuid, t.updatedAt)],
);

/* -------------------------------------------------------------------------- */
/* documents                                                                  */
/* -------------------------------------------------------------------------- */

export const documents = pgTable(
  'documents',
  {
    documentUuid: uuid('document_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // A document can live outside any folder — the old schema allows this.
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    key: text('key').notNull(),
    originalKey: text('original_key'),
    fileName: text('file_name').notNull(),
    type: text('type').notNull(),
    hasRagEmbeddings: boolean('has_rag_embeddings').notNull().default(false),
    youtubeVideoUuid: uuid('youtube_video_uuid'),
    flashcardDeckUuid: uuid('flashcard_deck_uuid'),
    documentCount: integer('document_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('documents_user_idx').on(t.userUuid, t.createdAt),
    index('documents_space_idx').on(t.spaceUuid),
  ],
);

/* -------------------------------------------------------------------------- */
/* chats                                                                      */
/* -------------------------------------------------------------------------- */

export const chats = pgTable(
  'chats',
  {
    chatUuid: uuid('chat_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    name: text('name'),
    hideInRecent: boolean('hide_in_recent').notNull().default(false),
    titleChangedByTheUser: boolean('title_changed_by_the_user').notNull().default(false),
    /** The UI shows the chat's Sources tab only when this is true. */
    isWebSearchCalled: boolean('is_web_search_called').notNull().default(false),
    /** The UI shows Flashcards/Quiz tabs only when this is true. */
    hasFlashcardsOrQuizzes: boolean('has_flashcards_or_quizzes').notNull().default(false),
    flashcardDeckUuid: uuid('flashcard_deck_uuid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('chats_user_idx').on(t.userUuid, t.updatedAt),
    index('chats_document_idx').on(t.documentUuid),
    index('chats_space_idx').on(t.spaceUuid),
  ],
);

/* -------------------------------------------------------------------------- */
/* messages                                                                   */
/* -------------------------------------------------------------------------- */

export const messages = pgTable(
  'messages',
  {
    messageUuid: uuid('message_uuid').primaryKey(),
    chatUuid: uuid('chat_uuid')
      .notNull()
      .references(() => chats.chatUuid, { onDelete: 'cascade' }),
    // Amplify stored this even though it is derivable from the chat. Keeping it
    // makes the RLS policy a direct column check instead of a join.
    userUuid: uuid('user_uuid').references(() => users.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    type: messageType('type').notNull().default('text'),
    content: text('content').notNull(),
    isCompleted: boolean('is_completed').notNull().default(true),
    agentStatus: text('agent_status'),
    toolName: text('tool_name'),
    toolArguments: jsonb('tool_arguments'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // The exact index the old Dynamo GSI provided:
  // index('chatUuid').sortKeys(['createdAt'])
  (t) => [index('messages_chat_idx').on(t.chatUuid, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* flashcards + questions (moveChat cascades into these)                      */
/* -------------------------------------------------------------------------- */

export const flashcards = pgTable(
  'flashcards',
  {
    flashcardUuid: uuid('flashcard_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    chatUuid: uuid('chat_uuid').references(() => chats.chatUuid, {
      onDelete: 'set null',
    }),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    references: jsonb('references'),
    vote: text('vote'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('flashcards_chat_idx').on(t.chatUuid, t.createdAt),
    index('flashcards_user_idx').on(t.userUuid, t.createdAt),
  ],
);

export const questions = pgTable(
  'questions',
  {
    questionUuid: uuid('question_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    chatUuid: uuid('chat_uuid').references(() => chats.chatUuid, {
      onDelete: 'set null',
    }),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    questionContent: text('question_content').notNull(),
    questionReferences: jsonb('question_references'),
    options: text('options').array().notNull(),
    answer: integer('answer').notNull(),
    hint: text('hint'),
    answerExplanations: text('answer_explanations').array(),
    vote: text('vote'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('questions_chat_idx').on(t.chatUuid, t.createdAt),
    index('questions_user_idx').on(t.userUuid, t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* relations                                                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  spaces: many(spaces),
  documents: many(documents),
  chats: many(chats),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  user: one(users, { fields: [spaces.userUuid], references: [users.id] }),
  documents: many(documents),
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, { fields: [chats.userUuid], references: [users.id] }),
  space: one(spaces, { fields: [chats.spaceUuid], references: [spaces.spaceUuid] }),
  document: one(documents, {
    fields: [chats.documentUuid],
    references: [documents.documentUuid],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatUuid], references: [chats.chatUuid] }),
}));

/* ========================================================================== */
/* Ported read models (step 2 of the "make the empty screens real" pass)      */
/* ========================================================================== */

/** Who shares a folder, and at what level (0 owner, 1 editor, 2 viewer). */
export const spaceUsers = pgTable(
  'space_users',
  {
    spaceUsersUuid: uuid('space_users_uuid').primaryKey(),
    spaceUuid: uuid('space_uuid')
      .notNull()
      .references(() => spaces.spaceUuid, { onDelete: 'cascade' }),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    level: integer('level').notNull().default(0),
    /**
     * Amplify stores the GSI sort key as a literal string: `"0#2026-01-27T10:15:16.629Z"`.
     * Kept as-is so ordering is byte-identical to the old app.
     */
    levelCreatedAt: text('level_created_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('space_users_space_idx').on(t.spaceUuid),
    index('space_users_user_idx').on(t.userUuid),
    index('space_users_level_idx').on(t.spaceUuid, t.levelCreatedAt),
  ],
);

/** Pipeline job records (document processing, generation, chat). */
export const tasks = pgTable(
  'tasks',
  {
    taskUuid: uuid('task_uuid').primaryKey(),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    messageUuid: uuid('message_uuid'),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('PENDING'),
    type: text('type').notNull(),
    args: jsonb('args'),
    progress: integer('progress').notNull().default(0),
    error: text('error'),
    result: text('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tasks_user_idx').on(t.userUuid, t.createdAt)],
);

/** One row per AI call (the rate-limit and cost ledger). */
export const userRequests = pgTable(
  'user_requests',
  {
    id: uuid('id').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    model: text('model').notNull().default(''),
    category: text('category'),
    feature: text('feature'),
    requestStatus: integer('request_status').notNull().default(200),
    promptTokenCount: integer('prompt_token_count').notNull().default(0),
    candidatesTokenCount: integer('candidates_token_count').notNull().default(0),
    totalTokenCount: integer('total_token_count').notNull().default(0),
    latency: integer('latency'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_requests_user_idx').on(t.userUuid, t.createdAt)],
);

export const userActionLogs = pgTable(
  'user_action_logs',
  {
    userActionLogUuid: uuid('user_action_log_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(),
    sourceType: text('source_type'),
    sourceUuid: uuid('source_uuid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_action_logs_user_idx').on(t.userUuid, t.createdAt)],
);

/** Arbitrary key/value attached to any entity (polymorphic). */
export const metadata = pgTable(
  'metadata',
  {
    metadataUuid: uuid('metadata_uuid').primaryKey(),
    targetUuid: text('target_uuid').notNull(),
    targetType: text('target_type').notNull(),
    name: text('name').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('metadata_target_idx').on(t.targetUuid, t.targetType)],
);

/* ------------------------------- quizzes ---------------------------------- */

export const quizzes = pgTable(
  'quizzes',
  {
    quizUuid: uuid('quiz_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: text('state').notNull().default('completed'),
    title: text('title'),
    description: text('description'),
    difficulty: text('difficulty'),
    sourceType: text('source_type'),
    sourceUuid: uuid('source_uuid'),
    questionCount: integer('question_count').notNull().default(0),
    lastScore: integer('last_score'),
    lastTotal: integer('last_total'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quizzes_user_idx').on(t.userUuid, t.createdAt)],
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    quizQuestionUuid: uuid('quiz_question_uuid').primaryKey(),
    quizUuid: uuid('quiz_uuid')
      .notNull()
      .references(() => quizzes.quizUuid, { onDelete: 'cascade' }),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceType: text('source_type'),
    sourceUuid: uuid('source_uuid'),
    questionContent: text('question_content').notNull(),
    questionReferences: jsonb('question_references'),
    options: text('options').array().notNull(),
    hint: text('hint'),
    answerExplanations: text('answer_explanations').array(),
    vote: text('vote'),
  },
  (t) => [index('quiz_questions_quiz_idx').on(t.quizUuid)],
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    quizAttemptUuid: uuid('quiz_attempt_uuid').primaryKey(),
    quizUuid: uuid('quiz_uuid')
      .notNull()
      .references(() => quizzes.quizUuid, { onDelete: 'cascade' }),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull().default(0),
    total: integer('total').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quiz_attempts_quiz_idx').on(t.quizUuid)],
);

/* ------------------------------ mock exams -------------------------------- */

export const mockExams = pgTable(
  'mock_exams',
  {
    mockExamUuid: uuid('mock_exam_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, { onDelete: 'set null' }),
    chatUuid: uuid('chat_uuid'),
    title: text('title').notNull(),
    examName: text('exam_name'),
    mockExamInfo: jsonb('mock_exam_info'),
    questions: jsonb('questions'),
    creationStatus: text('creation_status').notNull().default('GENERATED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('mock_exams_user_idx').on(t.userUuid, t.createdAt)],
);

export const mockExamLogs = pgTable(
  'mock_exam_logs',
  {
    mockExamLogUuid: uuid('mock_exam_log_uuid').primaryKey(),
    mockExamUuid: uuid('mock_exam_uuid')
      .notNull()
      .references(() => mockExams.mockExamUuid, { onDelete: 'cascade' }),
    questionAnswers: jsonb('question_answers'),
    status: text('status').notNull().default('IN_PROGRESS'),
    score: integer('score').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('mock_exam_logs_exam_idx').on(t.mockExamUuid)],
);

/* ------------------------------- commerce --------------------------------- */

export const bundles = pgTable('bundles', {
  bundleUuid: uuid('bundle_uuid').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  defaultSku: text('default_sku'),
  additionalSkus: text('additional_skus').array(),
  modules: text('modules').array(),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const examModules = pgTable('exam_modules', {
  examModuleUuid: uuid('exam_module_uuid').primaryKey(),
  moduleName: text('module_name').notNull(),
  questionKeys: text('question_keys').array(),
  price: integer('price').notNull().default(0),
  retired: boolean('retired').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const receipts = pgTable('receipts', {
  receiptId: text('receipt_id').primaryKey(),
  userId: uuid('user_id').notNull(),
  provider: text('provider').notNull().default('manual'),
  payload: text('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bundleUuid: uuid('bundle_uuid'),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source'),
    receiptId: text('receipt_id'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('purchases_user_idx').on(t.userId)],
);

export const curioSubscriptions = pgTable(
  'curio_subscriptions',
  {
    subscriptionId: uuid('subscription_id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('manual'),
    status: text('status').notNull().default('active'),
    tier: text('tier').notNull().default('super'),
    providerSubscriptionId: text('provider_subscription_id'),
    providerCustomerId: text('provider_customer_id'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    nextBillingDate: timestamp('next_billing_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('curio_subscriptions_user_idx').on(t.userId)],
);

/* ---------------------------- document detail ----------------------------- */

export const documentSummaries = pgTable(
  'document_summaries',
  {
    documentSummaryUuid: uuid('document_summary_uuid').primaryKey(),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    tags: text('tags').array(),
    keyConcepts: text('key_concepts').array(),
    markdown: text('markdown'),
    enrichedMarkdown: text('enriched_markdown'),
    vote: text('vote'),
    status: text('status').notNull().default('completed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('document_summaries_doc_idx').on(t.documentUuid)],
);

export const flashcardDecks = pgTable(
  'flashcard_decks',
  {
    flashcardDeckUuid: uuid('flashcard_deck_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    description: text('description'),
    flashcards: jsonb('flashcards'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('flashcard_decks_user_idx').on(t.userUuid)],
);

/* ========================================================================== */
/* Tables the dev migration needs that had not been modelled yet             */
/* ========================================================================== */

/** Citations attached to an assistant message (url ranges inside the text). */
export const chatCitations = pgTable(
  'chat_citations',
  {
    chatCitationUuid: uuid('chat_citation_uuid').primaryKey(),
    chatUuid: uuid('chat_uuid')
      .notNull()
      .references(() => chats.chatUuid, { onDelete: 'cascade' }),
    messageUuid: uuid('message_uuid')
      .notNull()
      .references(() => messages.messageUuid, { onDelete: 'cascade' }),
    userUuid: uuid('user_uuid').references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    startIndex: integer('start_index').notNull().default(0),
    endIndex: integer('end_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('chat_citations_chat_idx').on(t.chatUuid, t.createdAt)],
);

/**
 * Durable memory about a learner. `payload` arrives as `jsonb` but production
 * contains rows where a JSON string was stored and Amplify split it into a
 * character-indexed map — the importer repairs those.
 */
export const memoryBlocks = pgTable(
  'memory_blocks',
  {
    memoryBlockUuid: uuid('memory_block_uuid').primaryKey(),
    ownerUuid: uuid('owner_uuid').notNull(),
    scope: text('scope').notNull().default('user'),
    scopeId: text('scope_id').notNull(),
    blockType: text('block_type').notNull(),
    /** Amplify's GSI sort attribute: `"<blockType>#<updatedAt>"`. */
    blockTypeUpdatedAt: text('block_type_updated_at'),
    payload: jsonb('payload'),
    topic: text('topic').notNull(),
    subject: text('subject'),
    documentUuid: uuid('document_uuid'),
    confidence: doublePrecision('confidence').notNull().default(0),
    frequency: integer('frequency').notNull().default(1),
    attemptScores: doublePrecision('attempt_scores').array(),
    attemptDates: text('attempt_dates').array(),
    sources: text('sources').array(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastReinforcedAt: timestamp('last_reinforced_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    addedFrom: text('added_from'),
    isBackfill: boolean('is_backfill'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('memory_blocks_owner_idx').on(t.ownerUuid, t.blockTypeUpdatedAt),
    index('memory_blocks_scope_idx').on(t.scopeId),
  ],
);

export const memoryCandidates = pgTable(
  'memory_candidates',
  {
    memoryCandidateUuid: uuid('memory_candidate_uuid').primaryKey(),
    ownerUuid: uuid('owner_uuid').notNull(),
    scope: text('scope').notNull().default('user'),
    scopeId: text('scope_id').notNull(),
    proposedBlock: jsonb('proposed_block'),
    decision: text('decision').notNull().default('rejected'),
    mergedIntoUuid: uuid('merged_into_uuid'),
    messageUuid: uuid('message_uuid'),
    chatUuid: uuid('chat_uuid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('memory_candidates_owner_idx').on(t.ownerUuid, t.createdAt)],
);

/** Per-page layout detection output. Left out of the production plan; dev only. */
export const documentVisionOutputs = pgTable(
  'document_vision_outputs',
  {
    documentVisionOutputUuid: uuid('document_vision_output_uuid').primaryKey(),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    totalPages: integer('total_pages'),
    pageNumber: integer('page_number'),
    bbox: text('bbox'),
    className: text('class_name'),
    confidence: doublePrecision('confidence'),
    caption: text('caption'),
    text: text('text'),
  },
  (t) => [index('document_vision_outputs_doc_idx').on(t.documentUuid, t.pageNumber)],
);

/** Dead-letter table for rows the importer could not transform. */
export const importQuarantine = pgTable('import_quarantine', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceTable: text('source_table').notNull(),
  reason: text('reason').notNull(),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** YouTube sources — a Document of type "youtube" points at one of these. */
export const youtubeVideos = pgTable('youtube_videos', {
  youtubeVideoUuid: uuid('youtube_video_uuid').primaryKey(),
  videoId: text('video_id').notNull(),
  title: text('title'),
  transcriptKey: text('transcript_key'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* the remaining DynamoDB models                                              */
/* -------------------------------------------------------------------------- */

/**
 * The 15 models that had no table yet. Shapes come from
 * `amplify/data/resource.ts` in the old repo (and from the real dev rows where
 * the model has drifted), not from the UI's TypeScript, which is looser.
 *
 * Two things Amplify did for free and Postgres does not:
 *   - `createdAt`/`updatedAt` exist on every row even when the model does not
 *     declare them; every table below has both, so the bridge's `update` works.
 *   - Composite GSI sort keys (`moduleNumber#questionNumber`) are real columns,
 *     kept verbatim so ordering matches the old app.
 */

/** Document sections from the layout/vision pipeline. */
export const documentSections = pgTable(
  'document_sections',
  {
    documentSectionUuid: uuid('document_section_uuid').primaryKey(),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    documentType: text('document_type').notNull().default(''),
    subject: text('subject').notNull().default(''),
    sectionName: text('section_name').notNull().default(''),
    pageRange: text('page_range').notNull().default(''),
    sectionSummary: text('section_summary').notNull().default(''),
    sectionKeyConcepts: text('section_key_concepts').array().notNull().default([]),
    /** `DocumentContentBlock[]` — bounding boxes, page numbers, extracted text. */
    sectionContent: jsonb('section_content').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('document_sections_doc_idx').on(t.documentUuid)],
);

/** A completed (or in-progress) SAT mini exam, including the four modules. */
export const satMiniExamLogs = pgTable(
  'sat_mini_exam_logs',
  {
    satMiniExamLogUuid: uuid('sat_mini_exam_log_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** `SATMiniModule[]` — questions, answers and per-module scores. */
    modules: jsonb('modules').notNull().default([]),
    totalCorrect: integer('total_correct').notNull().default(0),
    totalQuestions: integer('total_questions').notNull().default(0),
    predictedSatScore: integer('predicted_sat_score').notNull().default(0),
    readingWritingScore: integer('reading_writing_score'),
    mathScore: integer('math_score'),
    /** concept → { correct, total } for the learning profile. */
    conceptPerformance: jsonb('concept_performance'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sat_mini_exam_logs_user_started_idx').on(t.userUuid, t.startedAt),
    index('sat_mini_exam_logs_user_completed_idx').on(t.userUuid, t.completedAt),
  ],
);

/** Flashcard games are a snapshot: the cards are copied into the row. */
export const flashcardGames = pgTable(
  'flashcard_games',
  {
    flashcardGameUuid: uuid('flashcard_game_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, { onDelete: 'set null' }),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    progress: integer('progress').notNull().default(0),
    score: integer('score').notNull().default(0),
    flashcards: jsonb('flashcards').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('flashcard_games_user_idx').on(t.userUuid, t.createdAt),
    index('flashcard_games_space_idx').on(t.spaceUuid, t.createdAt),
  ],
);

/** Pricing partners. No owner column: this is configuration, not user data. */
export const partnerships = pgTable(
  'partnerships',
  {
    partnershipUuid: uuid('partnership_uuid').primaryKey(),
    partnerName: text('partner_name').notNull().default(''),
    partnerCode: text('partner_code').notNull().default(''),
    logoS3Key: text('logo_s3_key'),
    /** A JSON *string* in DynamoDB; kept as text so nothing is silently reshaped. */
    priceRecordOverrides: text('price_record_overrides'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('partnerships_code_idx').on(t.partnerCode)],
);

/** Gifted / partnership subscriptions. PII, and no owner column — see rls.ts. */
export const futureUsers = pgTable(
  'future_users',
  {
    futureUserUuid: uuid('future_user_uuid').primaryKey(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    partnershipUuid: uuid('partnership_uuid').references(() => partnerships.partnershipUuid, {
      onDelete: 'set null',
    }),
    subStartDate: timestamp('sub_start_date', { withTimezone: true }),
    subEndDate: timestamp('sub_end_date', { withTimezone: true }),
    receiptPayload: jsonb('receipt_payload'),
    provider: text('provider'),
    tier: text('tier'),
    subscriptionGranted: boolean('subscription_granted'),
    subscriptionGrantedAt: timestamp('subscription_granted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('future_users_partnership_idx').on(t.partnershipUuid, t.createdAt)],
);

/** Internal batch job ledger (the replacement for the ECS/Step Functions fan-out). */
export const batchProcesses = pgTable(
  'batch_processes',
  {
    processId: uuid('process_id').primaryKey(),
    jobType: text('job_type').notNull().default(''),
    jobName: text('job_name'),
    state: text('state'),
    failed: boolean('failed').notNull().default(false),
    startTime: timestamp('start_time', { withTimezone: true }).notNull().defaultNow(),
    completionTime: timestamp('completion_time', { withTimezone: true }),
    totalJobs: integer('total_jobs').notNull().default(0),
    completedJobs: integer('completed_jobs').notNull().default(0),
    failedJobs: integer('failed_jobs').notNull().default(0),
    /** DynamoDB TTL; kept as the original epoch seconds. */
    ttl: integer('ttl'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('batch_processes_state_idx').on(t.state, t.startTime)],
);

/** Datalab (document AI) call ledger. `taskToken` is deliberately not imported. */
export const datalabRequests = pgTable(
  'datalab_requests',
  {
    requestId: text('request_id').primaryKey(),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    taskUuid: uuid('task_uuid').notNull(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** AWS Step Functions task token. Migrated as null: they are expired secrets. */
    taskToken: text('task_token'),
    status: text('status'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('datalab_requests_doc_idx').on(t.documentUuid, t.createdAt),
    index('datalab_requests_user_idx').on(t.userUuid, t.createdAt),
  ],
);

/** A generated mock exam paper. Its questions live in exam_paper_questions. */
export const examPapers = pgTable(
  'exam_papers',
  {
    examPaperUuid: uuid('exam_paper_uuid').primaryKey(),
    title: text('title').notNull().default(''),
    description: text('description'),
    examType: text('exam_type'),
    totalQuestions: integer('total_questions').notNull().default(0),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, { onDelete: 'set null' }),
    paperIndex: integer('paper_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('exam_papers_user_idx').on(t.userUuid, t.createdAt),
    index('exam_papers_doc_idx').on(t.documentUuid, t.createdAt),
    index('exam_papers_space_idx').on(t.spaceUuid, t.createdAt),
  ],
);

export const examPaperQuestions = pgTable(
  'exam_paper_questions',
  {
    examPaperQuestionUuid: uuid('exam_paper_question_uuid').primaryKey(),
    examPaperUuid: uuid('exam_paper_uuid')
      .notNull()
      .references(() => examPapers.examPaperUuid, { onDelete: 'cascade' }),
    moduleUuid: uuid('module_uuid').notNull(),
    questionNumber: text('question_number').notNull().default(''),
    questionContent: text('question_content').notNull().default(''),
    questionOptions: text('question_options').array().notNull().default([]),
    questionType: text('question_type').notNull().default(''),
    questionHint: text('question_hint').notNull().default(''),
    questionAnswerExplanations: text('question_answer_explanations').array().notNull().default([]),
    /** `ExamPaperQuestionReference[]` — image/table/page references. */
    questionReference: jsonb('question_reference'),
    moduleName: text('module_name'),
    moduleNumber: integer('module_number'),
    questionExamName: text('question_exam_name'),
    questionExamSubject: text('question_exam_subject'),
    questionTopic: text('question_topic'),
    difficultyLevel: text('difficulty_level'),
    verified: boolean('verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('exam_paper_questions_paper_idx').on(t.examPaperUuid)],
);

/** Admin question-extraction (PDF → questions) jobs. */
export const questionExtractJobs = pgTable(
  'question_extract_jobs',
  {
    questionExtractJobUuid: uuid('question_extract_job_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    s3Key: text('s3_key').notNull().default(''),
    fileName: text('file_name').notNull().default(''),
    fileType: text('file_type').notNull().default(''),
    status: text('status'),
    totalQuestions: integer('total_questions'),
    error: text('error'),
    /** Markdown progress log, written by the pipeline. */
    extractionLogs: text('extraction_logs'),
    /** JSON *string* of the modules identified in phase 1. */
    identifiedModules: text('identified_modules'),
    answerKeyS3Key: text('answer_key_s3_key'),
    answerKeyFileName: text('answer_key_file_name'),
    answerKeyStatus: text('answer_key_status'),
    answerKeyError: text('answer_key_error'),
    identifiedAnswerModules: text('identified_answer_modules'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('question_extract_jobs_user_idx').on(t.userUuid, t.createdAt)],
);

/** Admin question-generation (prompt → questions) jobs. */
export const questionGenerationJobs = pgTable(
  'question_generation_jobs',
  {
    questionGenerationJobUuid: uuid('question_generation_job_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull().default(''),
    status: text('status'),
    totalQuestions: integer('total_questions'),
    error: text('error'),
    generationLogs: text('generation_logs'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('question_generation_jobs_user_idx').on(t.userUuid, t.createdAt)],
);

/**
 * The shared question bank: extracted or generated questions used by the SAT
 * mini exams. Not user-owned — ownership belongs to the job that produced them.
 *
 * The id is **text**, not uuid: dev rows are `"<uuid>_m3_q4"`, which the old
 * `a.id()` declaration never enforced. A uuid column would quarantine all 120.
 */
export const extractedQuestions = pgTable(
  'extracted_questions',
  {
    extractedQuestionUuid: text('extracted_question_uuid').primaryKey(),
    questionExtractJobUuid: uuid('question_extract_job_uuid').references(
      () => questionExtractJobs.questionExtractJobUuid,
      { onDelete: 'cascade' },
    ),
    questionGenerationJobUuid: uuid('question_generation_job_uuid').references(
      () => questionGenerationJobs.questionGenerationJobUuid,
      { onDelete: 'cascade' },
    ),
    moduleNumber: integer('module_number').notNull().default(0),
    questionNumber: integer('question_number').notNull().default(0),
    /** Amplify's composite GSI key `moduleNumber#questionNumber`, kept verbatim. */
    moduleNumberQuestionNumber: text('module_number_question_number'),
    questionContent: text('question_content').notNull().default(''),
    questionType: text('question_type'),
    questionOptions: text('question_options').array().notNull().default([]),
    correctAnswer: text('correct_answer'),
    answerExplanations: text('answer_explanations').array(),
    hint: text('hint'),
    /** A single `ExtractedQuestionReference`, despite the legacy `.array()` GSI. */
    questionReference: jsonb('question_reference'),
    referenceExtractionStatus: text('reference_extraction_status'),
    referenceExtractionError: text('reference_extraction_error'),
    needsReference: boolean('needs_reference'),
    referenceGenerationPrompt: text('reference_generation_prompt'),
    needsCodeInterpreterForAnswer: boolean('needs_code_interpreter_for_answer'),
    exam: text('exam').notNull().default(''),
    module: text('module').notNull().default(''),
    topic: text('topic'),
    subtopic: text('subtopic'),
    concept: text('concept'),
    difficulty: text('difficulty'),
    examModuleUuid: uuid('exam_module_uuid'),
    verified: boolean('verified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by'),
    isGenerated: boolean('is_generated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('extracted_questions_extract_job_idx').on(
      t.questionExtractJobUuid,
      t.moduleNumberQuestionNumber,
    ),
    index('extracted_questions_generation_job_idx').on(t.questionGenerationJobUuid, t.createdAt),
    index('extracted_questions_exam_module_idx').on(t.examModuleUuid, t.createdAt),
  ],
);

/** Seeded sample documents (the "mock" library), not user uploads. */
export const mockDocuments = pgTable(
  'mock_documents',
  {
    mockDocumentUuid: uuid('mock_document_uuid').primaryKey(),
    documentUuid: uuid('document_uuid')
      .notNull()
      .references(() => documents.documentUuid, { onDelete: 'cascade' }),
    thumbnailKey: text('thumbnail_key').notNull().default(''),
    contentKey: text('content_key').notNull().default(''),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    youtube: boolean('youtube').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('mock_documents_doc_idx').on(t.documentUuid)],
);

/** Global app configuration: feature flags, maintenance message, memory kill switch. */
export const appSettings = pgTable('app_settings', {
  appSettingsUuid: uuid('app_settings_uuid').primaryKey(),
  /** `FeatureFlag[]` — { flagName, flagValue }. */
  featureFlags: jsonb('feature_flags').notNull().default([]),
  maintenanceMessage: text('maintenance_message'),
  memoryFeatureEnabled: boolean('memory_feature_enabled'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Mastery changes that used to feed the Neptune learning profile. */
export const userLearningProfileHistory = pgTable(
  'user_learning_profile_history',
  {
    userLearningProfileHistoryUuid: uuid('user_learning_profile_history_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    concept: text('concept').notNull().default(''),
    /** `{ oldValue, newValue }`. */
    change: jsonb('change').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('user_learning_profile_history_user_idx').on(t.userUuid, t.createdAt),
    index('user_learning_profile_history_concept_idx').on(t.concept, t.createdAt),
  ],
);
