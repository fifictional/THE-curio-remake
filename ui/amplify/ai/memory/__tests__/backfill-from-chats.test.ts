import { describe, expect, it } from 'vitest';
import { pairChatInteractionTurns } from '../backfill-from-chats';

describe('pairChatInteractionTurns', () => {
  it('pairs user messages with the following assistant reply', () => {
    const pairs = pairChatInteractionTurns([
      {
        messageUuid: 'm1',
        role: 'user',
        content: 'What is HERA 2017?',
        type: 'text',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
      {
        messageUuid: 'm2',
        role: 'assistant',
        content: 'HERA 2017 reformed UK higher education regulation.',
        type: 'text',
        createdAt: '2026-01-01T10:00:05.000Z',
      },
      {
        messageUuid: 'm3',
        role: 'user',
        content: 'What is OfS?',
        type: 'text',
        createdAt: '2026-01-01T10:01:00.000Z',
      },
      {
        messageUuid: 'm4',
        role: 'assistant',
        content: 'The Office for Students regulates English universities.',
        type: 'text',
        createdAt: '2026-01-01T10:01:05.000Z',
      },
    ]);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({
      messageUuid: 'm1',
      userTurn: 'What is HERA 2017?',
      assistantTurn: 'HERA 2017 reformed UK higher education regulation.',
      occurredAt: '2026-01-01T10:00:00.000Z',
    });
    expect(pairs[1].messageUuid).toBe('m3');
  });

  it('skips tool messages and unmatched user turns', () => {
    const pairs = pairChatInteractionTurns([
      {
        messageUuid: 'm1',
        role: 'user',
        content: 'Make flashcards',
        type: 'text',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
      {
        messageUuid: 'm2',
        role: 'assistant',
        content: 'Creating flashcards…',
        type: 'tool',
        createdAt: '2026-01-01T10:00:01.000Z',
      },
      {
        messageUuid: 'm3',
        role: 'assistant',
        content: 'Here are your flashcards.',
        type: 'text',
        createdAt: '2026-01-01T10:00:02.000Z',
      },
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].assistantTurn).toBe('Here are your flashcards.');
  });
});
