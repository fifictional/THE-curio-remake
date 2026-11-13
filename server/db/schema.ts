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

export const users = pgTable('users', {
  userUuid: uuid('user_uuid').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* spaces (folders)                                                           */
/* -------------------------------------------------------------------------- */

export const spaces = pgTable(
  'spaces',
  {
    spaceUuid: uuid('space_uuid').primaryKey(),
    userUuid: uuid('user_uuid')
      .notNull()
      .references(() => users.userUuid, { onDelete: 'cascade' }),
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
      .references(() => users.userUuid, { onDelete: 'cascade' }),
    // A document can live outside any folder — the old schema allows this.
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    key: text('key').notNull(),
    originalKey: text('original_key'),
    fileName: text('file_name').notNull(),
    type: text('type').notNull(),
    hasRagEmbeddings: boolean('has_rag_embeddings').notNull().default(false),
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
      .references(() => users.userUuid, { onDelete: 'cascade' }),
    spaceUuid: uuid('space_uuid').references(() => spaces.spaceUuid, {
      onDelete: 'set null',
    }),
    documentUuid: uuid('document_uuid').references(() => documents.documentUuid, {
      onDelete: 'set null',
    }),
    name: text('name'),
    hideInRecent: boolean('hide_in_recent').notNull().default(false),
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
      .references(() => users.userUuid, { onDelete: 'cascade' }),
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
      .references(() => users.userUuid, { onDelete: 'cascade' }),
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
    options: text('options').array().notNull(),
    answer: integer('answer').notNull(),
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
  user: one(users, { fields: [spaces.userUuid], references: [users.userUuid] }),
  documents: many(documents),
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, { fields: [chats.userUuid], references: [users.userUuid] }),
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
