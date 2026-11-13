import { describe, it, expect } from 'vitest';
import { extractDataFromBuffer } from '../gpt-extract-data-from-buffer';

describe('extractDataFromBuffer', () => {
  it('parses single complete event', () => {
    const input = `event: response.output_text.delta\n` +
                  `data: {"delta":"Hello","sequence_number":0}`;
    const { events, remainder } = extractDataFromBuffer(input);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('response.output_text.delta');
    expect(events[0].data).toEqual({ delta: 'Hello', sequence_number: 0 });
    expect(remainder).toBe('');
  });

  it('parses multiple events and returns empty remainder', () => {
    const input = `event: response.output_text.delta\n` +
                  `data: {"delta":"Hello","sequence_number":0}\n\n` +
                  `event: response.output_text.delta\n` +
                  `data: {"delta":" world","sequence_number":1}`;
    const { events, remainder } = extractDataFromBuffer(input);
    expect(events).toHaveLength(2);
    expect(events[0].name).toBe('response.output_text.delta');
    expect(events[1].name).toBe('response.output_text.delta');
    expect(remainder).toBe('');
  });

  it('keeps incomplete JSON in remainder', () => {
    const input = `event: response.output_text.delta\n` +
                  `data: {"delta":"Hello","sequence_number":0}\n\n` +
                  `event: response.completed\n` +
                  `data: {"response": {"usage": {"total_tokens":`;
    const { events, remainder } = extractDataFromBuffer(input);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('response.output_text.delta');
    expect(typeof remainder).toBe('string');
    expect(remainder.length).toBeGreaterThan(0);
    expect(remainder).toMatch(/event: response.completed/);
  });

  it('handles extra whitespace and windows newlines', () => {
    const input = `event: response.output_text.delta\r\n` +
                  `data: {"delta":"Hello","sequence_number":0}\r\n\r\n` +
                  `event: response.completed\r\n` +
                  `data: {"response": {"usage": {"total_tokens": 5}}}`;
    const { events, remainder } = extractDataFromBuffer(input);
    expect(events).toHaveLength(2);
    expect(events[0].name).toBe('response.output_text.delta');
    expect(events[1].name).toBe('response.completed');
    expect(remainder).toBe('');
  });
});

