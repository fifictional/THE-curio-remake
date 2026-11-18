/**
 * Seed data for the chat slice.
 *
 *   npm run db:seed
 *
 * Fixed UUIDs on purpose: the local page and the tests can rely on them.
 * Idempotent — deletes the seeded rows first, then re-inserts.
 */

import 'dotenv/config';

import { auth } from './auth';
import { ownerSql as sql } from './db/owner-client';
import { ownerDb } from './db/owner-client';
import {
  bundles,
  chats,
  curioSubscriptions,
  documentSummaries,
  documents,
  examModules,
  flashcardDecks,
  flashcards,
  messages,
  metadata,
  mockExamLogs,
  mockExams,
  purchases,
  questions,
  quizAttempts,
  quizQuestions,
  quizzes,
  receipts,
  spaceUsers,
  spaces,
  tasks,
  userActionLogs,
  userRequests,
} from './db/schema';

const SPACE_OLD = '22222222-2222-4222-8222-222222222222';
const SPACE_NEW = '33333333-3333-4333-8333-333333333333';
const CHAT = '44444444-4444-4444-8444-444444444444';

async function main() {
  // TRUNCATE is not subject to row-level security, so this clears the seeded
  // data without needing a user context. (DELETE would be filtered by RLS.)
  await sql.unsafe(`
    truncate table messages, flashcards, questions, chats, spaces, documents,
                   space_users, tasks, user_requests, user_action_logs, metadata,
                   quizzes, quiz_questions, quiz_attempts, mock_exams, mock_exam_logs,
                   bundles, exam_modules, receipts, purchases, curio_subscriptions,
                   document_summaries, flashcard_decks,
                   sessions, accounts, verifications, users
    restart identity cascade
  `);

  // Create the identity through Better Auth so the password hash / account row
  // are produced by the library, not hand-rolled here.
  const signUp = await auth.api.signUpEmail({
    body: {
      email: 'local@curio.test',
      password: 'localpassword123',
      name: 'Local User',
    },
  });
  const USER = signUp.user.id;

  // Seeding uses the owner connection: it bypasses RLS, which is fine for a
  // dev fixture script (the app role never does).
  const db = ownerDb;
  {
  await db.insert(spaces).values([
    { spaceUuid: SPACE_OLD, userUuid: USER, name: 'Biology' },
    { spaceUuid: SPACE_NEW, userUuid: USER, name: 'Chemistry' },
  ]);

  await db.insert(chats).values({
    chatUuid: CHAT,
    userUuid: USER,
    spaceUuid: SPACE_OLD,
    name: 'Photosynthesis questions',
  });

  await db.insert(messages).values([
    {
      messageUuid: '55555555-5555-4555-8555-555555555551',
      chatUuid: CHAT,
      role: 'user',
      content: 'what is photosynthesis',
      createdAt: new Date('2026-11-12T10:00:00Z'),
    },
    {
      messageUuid: '55555555-5555-4555-8555-555555555552',
      chatUuid: CHAT,
      role: 'assistant',
      content: 'Plants turning light into chemical energy.',
      createdAt: new Date('2026-11-12T10:00:05Z'),
    },
  ]);

  await db.insert(flashcards).values([
    {
      flashcardUuid: '66666666-6666-4666-8666-666666666661',
      userUuid: USER,
      spaceUuid: SPACE_OLD,
      chatUuid: CHAT,
      title: 'Chlorophyll',
      content: 'The pigment that absorbs light.',
    },
  ]);

  await db.insert(questions).values([
    {
      questionUuid: '77777777-7777-4777-8777-777777777771',
      userUuid: USER,
      spaceUuid: SPACE_OLD,
      chatUuid: CHAT,
      questionContent: 'Where does photosynthesis happen?',
      options: ['Chloroplast', 'Nucleus', 'Ribosome', 'Mitochondria'],
      answer: 0,
    },
  ]);

    /* -------------------- demo content so screens are not empty ---------- */

    const DOC = '88888888-8888-4888-8888-888888888888';
    const QUIZ = '99999999-9999-4999-8999-999999999999';
    const MOCK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const BUNDLE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    await db.insert(spaceUsers).values([
      { spaceUsersUuid: crypto.randomUUID(), spaceUuid: SPACE_OLD, userUuid: USER, level: 0 },
      { spaceUsersUuid: crypto.randomUUID(), spaceUuid: SPACE_NEW, userUuid: USER, level: 0 },
    ]);

    await db.insert(documents).values({
      documentUuid: DOC,
      userUuid: USER,
      spaceUuid: SPACE_OLD,
      key: 'local/docs/photosynthesis.pdf',
      originalKey: 'local/docs/photosynthesis.pdf',
      fileName: 'Photosynthesis notes.pdf',
      type: 'pdf',
      hasRagEmbeddings: false,
    });

    await db.insert(documentSummaries).values({
      documentSummaryUuid: crypto.randomUUID(),
      documentUuid: DOC,
      title: 'Photosynthesis notes',
      summary: 'How plants convert light into chemical energy.',
      tags: ['biology', 'photosynthesis'],
      keyConcepts: ['chlorophyll', 'light reactions', 'Calvin cycle'],
      status: 'completed',
    });

    await db.insert(flashcardDecks).values({
      flashcardDeckUuid: crypto.randomUUID(),
      userUuid: USER,
      title: 'Photosynthesis deck',
      description: 'Key terms from the notes',
      flashcards: [
        { front: 'Chlorophyll', back: 'The pigment that absorbs light.' },
        { front: 'Calvin cycle', back: 'Light-independent reactions producing sugar.' },
      ],
    });

    await db.insert(quizzes).values({
      quizUuid: QUIZ,
      userUuid: USER,
      state: 'completed',
      title: 'Photosynthesis quiz',
      description: 'Three questions',
      difficulty: 'easy',
      sourceType: 'chat',
      sourceUuid: CHAT,
      questionCount: 3,
    });

    await db.insert(quizQuestions).values([
      {
        quizQuestionUuid: crypto.randomUUID(),
        quizUuid: QUIZ,
        userUuid: USER,
        sourceType: 'chat',
        sourceUuid: CHAT,
        questionContent: 'Where does photosynthesis happen?',
        options: ['Chloroplast', 'Nucleus', 'Ribosome', 'Mitochondria'],
        hint: 'It contains chlorophyll.',
      },
      {
        quizQuestionUuid: crypto.randomUUID(),
        quizUuid: QUIZ,
        userUuid: USER,
        sourceType: 'chat',
        sourceUuid: CHAT,
        questionContent: 'What is released as a by-product?',
        options: ['Oxygen', 'Nitrogen', 'Methane', 'Hydrogen'],
      },
    ]);

    await db.insert(quizAttempts).values({
      quizAttemptUuid: crypto.randomUUID(),
      quizUuid: QUIZ,
      userUuid: USER,
      score: 2,
      total: 3,
    });

    await db.insert(mockExams).values({
      mockExamUuid: MOCK,
      userUuid: USER,
      spaceUuid: SPACE_OLD,
      chatUuid: CHAT,
      title: 'Biology practice test',
      examName: 'Practice Test 1',
      creationStatus: 'GENERATED',
      mockExamInfo: { durationMinutes: 30, sections: ['Biology'] },
      questions: [],
    });

    await db.insert(mockExamLogs).values({
      mockExamLogUuid: crypto.randomUUID(),
      mockExamUuid: MOCK,
      status: 'COMPLETED',
      score: 2,
      questionAnswers: [],
    });

    await db.insert(examModules).values({
      examModuleUuid: crypto.randomUUID(),
      moduleName: 'Biology Basics',
      questionKeys: [],
      price: 0,
      retired: false,
    });

    await db.insert(bundles).values({
      bundleUuid: BUNDLE,
      name: 'Starter bundle',
      description: 'Local demo bundle',
      order: 0,
      modules: [],
      published: true,
    });

    await db.insert(receipts).values({
      receiptId: 'local-receipt-1',
      userId: USER,
      provider: 'manual',
      payload: '{}',
    });

    await db.insert(purchases).values({
      id: crypto.randomUUID(),
      userId: USER,
      bundleUuid: BUNDLE,
      source: 'manual',
      receiptId: 'local-receipt-1',
    });

    await db.insert(curioSubscriptions).values({
      subscriptionId: crypto.randomUUID(),
      userId: USER,
      provider: 'manual',
      status: 'active',
      tier: 'super',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
    });

    await db.insert(tasks).values({
      taskUuid: crypto.randomUUID(),
      documentUuid: DOC,
      userUuid: USER,
      status: 'COMPLETED',
      type: 'DOCUMENT_PROCESSING',
      progress: 100,
    });

    await db.insert(userRequests).values({
      id: crypto.randomUUID(),
      userUuid: USER,
      model: 'gpt-4o-mini',
      category: 'chat',
      feature: 'chat_main',
      requestStatus: 200,
      totalTokenCount: 128,
      latency: 900,
    });

    await db.insert(userActionLogs).values({
      userActionLogUuid: crypto.randomUUID(),
      userUuid: USER,
      actionType: 'chat_message',
      sourceType: 'chat',
      sourceUuid: CHAT,
    });

    await db.insert(metadata).values({
      metadataUuid: crypto.randomUUID(),
      targetUuid: CHAT,
      targetType: 'chat',
      name: 'seeded',
      value: 'true',
    });
  }

  console.log('seeded');
  console.log('  login     local@curio.test / localpassword123');
  console.log('  user     ', USER);
  console.log('  spaces   ', SPACE_OLD, '(old)  ', SPACE_NEW, '(new)');
  console.log('  chat     ', CHAT);
  console.log('\n  try: curl "http://localhost:3101/messages?chat=' + CHAT + '"');
}

await main();
await sql.end();
process.exit(0);
