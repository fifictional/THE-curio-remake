#!/usr/bin/env node
/**
 * Build a small NDJSON fixture that mirrors the real DynamoDB shapes, so the
 * importer can be exercised (and regression-tested) without AWS access.
 *
 *   node scripts/make-fixture.mjs --out /tmp/fixture
 *   node scripts/import-postgres.mjs --raw /tmp/fixture --truncate
 *
 * Deliberately includes the two things production taught us:
 *   - a MemoryBlock whose payload was split into a character-indexed map
 *   - a message with no userUuid (derived rows the schema did not declare)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const i = process.argv.indexOf('--out');
const OUT = i > -1 ? process.argv[i + 1] : '/tmp/curio-fixture';

const U = '11111111-1111-4111-8111-111111111111';
const S = '22222222-2222-4222-8222-222222222222';
const D = '33333333-3333-4333-8333-333333333333';
const C = '44444444-4444-4444-8444-444444444444';
const M = '55555555-5555-4555-8555-555555555555';
const QUIZ = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const EXAM = '13131313-1313-4131-8131-131313131313';
const BUNDLE = '21212121-2121-4212-8212-212121212121';
const now = '2026-01-01T00:00:00.000Z';

const rows = {
  UserProfile: [
    {
      __typename: 'UserProfile',
      userUuid: U,
      userEmail: 'fixture@curio.test',
      firstName: 'Fixture',
      lastName: 'User',
      country: 'GB',
      userHelp: 'Test the importer',
      onboardingCompleted: true,
      onboardingSkipped: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Space: [{ __typename: 'Space', spaceUuid: S, userUuid: U, name: 'Biology', createdAt: now, updatedAt: now }],
  SpaceUsers: [
    {
      __typename: 'SpaceUsers',
      spaceUsersUuid: '66666666-6666-4666-8666-666666666666',
      spaceUuid: S,
      userUuid: U,
      level: 0,
      'level#createdAt': '0#2026-01-27T10:15:16.629Z',
      createdAt: now,
      updatedAt: now,
    },
  ],
  YoutubeVideo: [
    {
      __typename: 'YoutubeVideo',
      youtubeVideoUuid: '77777777-7777-4777-8777-777777777777',
      videoId: 'fixture01',
      title: 'A fixture video',
      transcriptKey: 'yt-transcripts/fixture01/youtube-transcript.md',
      thumbnailUrl: 'https://example.test/t.jpg',
      createdAt: now,
      updatedAt: now,
    },
  ],
  Document: [
    {
      __typename: 'Document',
      documentUuid: D,
      userUuid: U,
      spaceUuid: S,
      fileName: 'notes.pdf',
      key: `student-documents/${U}/${D}`,
      originalKey: `student-documents/${U}/originals/${D}`,
      type: 'application/pdf',
      hasRagEmbeddings: true,
      documentCount: 1,
      createdAt: now,
      updatedAt: now,
    },
  ],
  DocumentSummary: [
    {
      __typename: 'DocumentSummary',
      documentSummaryUuid: '88888888-8888-4888-8888-888888888888',
      documentUuid: D,
      title: 'Notes',
      summary: '# Summary\nFixture content',
      tags: ['biology'],
      keyConcepts: ['chlorophyll'],
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    },
  ],
  Chat: [
    {
      __typename: 'Chat',
      chatUuid: C,
      userUuid: U,
      spaceUuid: S,
      documentUuid: D,
      name: 'Notes chat',
      hasFlashcardsOrQuizzes: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Message: [
    {
      __typename: 'Message',
      messageUuid: M,
      chatUuid: C,
      userUuid: U,
      role: 'user',
      content: 'what is this',
      isCompleted: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      // Derived rows carry no userUuid — the importer must accept NULL.
      __typename: 'Message',
      messageUuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      chatUuid: C,
      role: 'assistant',
      content: 'it is a note',
      isCompleted: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  ChatCitation: [
    {
      __typename: 'ChatCitation',
      chatCitationUuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      chatUuid: C,
      messageUuid: M,
      userUuid: U,
      type: 'url_citation',
      title: 'Source',
      url: 'https://example.test/source',
      startIndex: 5,
      endIndex: 10,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Flashcard: [
    {
      __typename: 'Flashcard',
      flashcardUuid: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userUuid: U,
      chatUuid: C,
      title: 'Term',
      content: 'Definition',
      references: [{ reference_name: '#S1', reference_content: 'text', reference_url: '', reference_type: 'text' }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  Question: [
    {
      __typename: 'Question',
      questionUuid: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userUuid: U,
      documentUuid: D,
      questionContent: 'Q?',
      options: ['a', 'b'],
      answer: 0,
      hint: 'h',
      answerExplanations: ['yes', 'no'],
      questionReferences: [{ reference_name: '#R', reference_content: 'c', reference_url: '', reference_type: 'text' }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  Quiz: [
    {
      __typename: 'Quiz',
      quizUuid: QUIZ,
      userUuid: U,
      state: 'completed',
      sourceType: 'chat',
      sourceUuid: C,
      questionCount: 2,
      lastScore: 1,
      lastTotal: 2,
      createdAt: now,
      updatedAt: now,
    },
  ],
  QuizQuestion: [
    {
      __typename: 'QuizQuestion',
      quizQuestionUuid: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      quizUuid: QUIZ,
      userUuid: U,
      sourceType: 'chat',
      sourceUuid: C,
      questionContent: 'Q?',
      options: ['a', 'b'],
      hint: 'h',
    },
  ],
  QuizAttempt: [
    {
      __typename: 'QuizAttempt',
      quizAttemptUuid: '12121212-1212-4121-8121-121212121212',
      quizUuid: QUIZ,
      userUuid: U,
      score: 1,
      total: 2,
      createdAt: now,
      updatedAt: now,
    },
  ],
  MockExam: [
    {
      __typename: 'MockExam',
      mockExamUuid: EXAM,
      userUuid: U,
      chatUuid: C,
      title: 'Fixture test',
      creationStatus: 'GENERATED',
      mockExamInfo: { topic: 'Biology' },
      // Out-of-range answer, as found in production.
      questions: [{ questionContent: 'Q?', options: ['a'], answer: -15 }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  MockExamLog: [
    {
      __typename: 'MockExamLog',
      mockExamLogUuid: '14141414-1414-4141-8141-141414141414',
      mockExamUuid: EXAM,
      status: 'COMPLETED',
      score: 1,
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Task: [
    {
      __typename: 'Task',
      taskUuid: '15151515-1515-4151-8151-151515151515',
      documentUuid: D,
      userUuid: U,
      status: 'COMPLETED',
      type: 'DOCUMENT_PROCESSING',
      args: { chatArgs: { chatUuid: C } },
      progress: 100,
      createdAt: now,
      updatedAt: now,
    },
  ],
  UserRequest: [
    {
      __typename: 'UserRequest',
      userUuid: U,
      model: 'gpt-5',
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
      requestStatus: 200,
      latency: 100,
      createdAt: now,
      updatedAt: now,
    },
  ],
  UserActionLog: [
    {
      __typename: 'UserActionLog',
      userActionLogUuid: '16161616-1616-4161-8161-161616161616',
      userUuid: U,
      actionType: 'sent_chat_message',
      sourceType: 'chat',
      sourceUuid: C,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Metadata: [
    {
      __typename: 'Metadata',
      metadataUuid: '17171717-1717-4171-8171-171717171717',
      targetUuid: D,
      targetType: 'document',
      name: 'fileTypeDetectionConfidence',
      value: '9',
      createdAt: now,
      updatedAt: now,
    },
  ],
  MemoryBlock: [
    {
      // Healthy row.
      __typename: 'MemoryBlock',
      memoryBlockUuid: '18181818-1818-4181-8181-181818181818',
      ownerUuid: U,
      scope: 'user',
      scopeId: U,
      blockType: 'knowledge_gap',
      'blockType#updatedAt': 'knowledge_gap#2026-06-11T11:51:51.631Z',
      payload: { topic: 'acceptance', description: 'asked', askedCount: 1 },
      topic: 'Acceptance',
      subject: 'Law',
      confidence: 0.65,
      frequency: 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      // Corrupted row: payload split into a character-indexed map.
      __typename: 'MemoryBlock',
      memoryBlockUuid: '19191919-1919-4191-8191-191919191919',
      ownerUuid: U,
      scope: 'user',
      scopeId: U,
      blockType: 'knowledge_gap',
      'blockType#updatedAt': 'knowledge_gap#2026-06-24T13:09:02.175Z',
      payload: Object.fromEntries(
        [...JSON.stringify({ topic: 'tort', description: 'asked twice', askedCount: 2 })].map((ch, i2) => [
          String(i2),
          ch,
        ]),
      ),
      topic: 'Tort',
      subject: 'Law',
      confidence: 0.675,
      frequency: 2,
      version: 2,
      createdAt: now,
      updatedAt: now,
    },
  ],
  MemoryCandidate: [
    {
      __typename: 'MemoryCandidate',
      memoryCandidateUuid: '20202020-2020-4202-8202-202020202020',
      ownerUuid: U,
      scope: 'user',
      scopeId: U,
      proposedBlock: { topic: 'mcp', askedCount: 1 },
      decision: 'rejected',
      createdAt: now,
      updatedAt: now,
    },
  ],
  Bundle: [
    {
      __typename: 'Bundle',
      bundleUuid: BUNDLE,
      name: 'SAT',
      defaultSku: 'SATUS-001',
      modules: [],
      additionalSkus: ['paddle:pri_fixture'],
      published: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  ExamModule: [
    {
      __typename: 'ExamModule',
      examModuleUuid: '22222222-2222-4222-8222-22222222222a',
      moduleName: 'SAT Math',
      questionKeys: [],
      price: 0,
      retired: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
  Receipt: [{ __typename: 'Receipt', receiptId: 'fixture-receipt', userId: U, provider: 'paddle', payload: '{}', createdAt: now, updatedAt: now }],
  Purchase: [
    {
      __typename: 'Purchase',
      userId: U,
      bundleUuid: BUNDLE,
      purchasedAt: now,
      source: 'paddle',
      createdAt: now,
      updatedAt: now,
    },
  ],
  CurioSubscription: [
    {
      __typename: 'CurioSubscription',
      subscriptionId: '23232323-2323-4232-8232-232323232323',
      userId: U,
      provider: 'paddle',
      status: 'active',
      tier: 'ultra',
      nextBillingDate: '2027-01-01T00:00:00.000Z',
      currentPeriodStart: now,
      currentPeriodEnd: '2027-01-01T00:00:00.000Z',
      createdAt: now,
      updatedAt: now,
    },
  ],
};

await mkdir(OUT, { recursive: true });
for (const [model, items] of Object.entries(rows)) {
  await writeFile(join(OUT, `${model}.ndjson`), items.map((i2) => JSON.stringify(i2)).join('\n') + '\n');
}

console.log(`fixture written to ${OUT} (${Object.keys(rows).length} tables)`);
