/**
 * Seed data for the chat slice.
 *
 *   npm run db:seed
 *
 * Fixed UUIDs on purpose: the local page and the tests can rely on them.
 * Idempotent — deletes the seeded rows first, then re-inserts.
 */

import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { auth } from './auth';
import { db, sql } from './db/client';
import { chats, flashcards, messages, questions, spaces, users } from './db/schema';

const SPACE_OLD = '22222222-2222-4222-8222-222222222222';
const SPACE_NEW = '33333333-3333-4333-8333-333333333333';
const CHAT = '44444444-4444-4444-8444-444444444444';

async function main() {
  // children first
  await db.delete(messages).where(eq(messages.chatUuid, CHAT));
  await db.delete(flashcards);
  await db.delete(questions);
  await db.delete(chats);
  await db.delete(spaces);
  await db.delete(users);

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
