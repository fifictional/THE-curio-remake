import { describe, expect, it } from 'vitest';
import {
  buildReflectionUserContent,
  parseLlmReflectionResponse,
} from '../../../ai/memory/extractors/llm-reflection-extractor';

describe('llm-reflection-extractor', () => {
  it('builds chat content for short struggle messages', () => {
    const content = buildReflectionUserContent({
      type: 'chat_interaction',
      ownerUuid: 'u1',
      chatUuid: 'c1',
      messageUuid: 'm1',
      userTurn: "I don't know, I am very basic in maths",
      assistantTurn: 'Let us start with what a prime number is.',
    });
    expect(content).toContain("I don't know");
    expect(content).toContain('prime number');
  });

  it('parses agent gap from JSON', () => {
    const raw = `{
      "candidates": [{
        "blockType": "knowledge_gap",
        "topic": "Prime numbers",
        "subject": "Mathematics",
        "confidence": 0.72,
        "description": "Student said they are very basic in maths during primes lesson."
      }]
    }`;
    const candidates = parseLlmReflectionResponse(raw, {
      ownerUuid: 'u1',
      scope: 'user',
      scopeId: 'u1',
      userTurn: "I don't know",
      assistantTurn: 'primes',
      messageUuid: 'm1',
      chatUuid: 'c1',
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].topic).toBe('Prime numbers');
    expect(candidates[0].blockType).toBe('knowledge_gap');
  });

  it('accepts empty candidates when agent stores nothing', () => {
    const candidates = parseLlmReflectionResponse(
      '{"candidates": []}',
      {
        ownerUuid: 'u1',
        scope: 'user',
        scopeId: 'u1',
        userTurn: 'hi',
        assistantTurn: 'hello',
      }
    );
    expect(candidates).toHaveLength(0);
  });
});
