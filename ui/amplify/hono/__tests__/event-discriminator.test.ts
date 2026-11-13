import { describe, it, expect } from 'vitest';

import {
  classifyEvent,
  isAppSyncEvent,
  isDirectInvoke,
  isScheduledEvent,
  isBatchCreatorCronEvent,
} from '../shared/event-discriminator';
import {
  buildAppSyncEvent,
  buildAmplifyFunctionHandlerEvent,
  buildDirectInvokeEvent,
  buildScheduledEvent,
} from '../shared/test-utils';

describe('event-discriminator', () => {
  it('recognises AppSync resolver events', () => {
    const event = buildAppSyncEvent({ fieldName: 'aiChat', args: { messageUuid: 'abc' } });
    expect(isAppSyncEvent(event)).toBe(true);
    expect(isDirectInvoke(event)).toBe(false);
    expect(isScheduledEvent(event)).toBe(false);
    expect(classifyEvent(event)).toBe('appsync');
  });

  it('recognises Amplify Gen 2 flattened function handler events', () => {
    const event = buildAmplifyFunctionHandlerEvent({
      fieldName: 'runMemoryBackfill',
      args: { userUuid: 'user-1' },
    });
    expect(isAppSyncEvent(event)).toBe(true);
    expect(isDirectInvoke(event)).toBe(false);
    expect(classifyEvent(event)).toBe('appsync');
  });

  it('recognises flattened events without typeName', () => {
    const event = {
      fieldName: 'deleteChat',
      arguments: { chatUuid: 'c-1' },
    };
    expect(isAppSyncEvent(event)).toBe(true);
    expect(classifyEvent(event)).toBe('appsync');
  });

  it('recognises EventBridge scheduled events', () => {
    const event = buildScheduledEvent();
    expect(isScheduledEvent(event)).toBe(true);
    expect(isAppSyncEvent(event)).toBe(false);
    expect(isDirectInvoke(event)).toBe(false);
    expect(classifyEvent(event)).toBe('cron');
  });

  it('recognises direct-invoke events with __route', () => {
    const event = buildDirectInvokeEvent('deleteDocument', { documentUuid: 'doc-1' });
    expect(isDirectInvoke(event)).toBe(true);
    expect(isAppSyncEvent(event)).toBe(false);
    expect(isScheduledEvent(event)).toBe(false);
    expect(classifyEvent(event)).toBe('direct');
  });

  it('rejects payloads with neither shape', () => {
    expect(classifyEvent({ random: 'payload' })).toBe('unknown');
    expect(classifyEvent(null)).toBe('unknown');
    expect(classifyEvent('string')).toBe('unknown');
    expect(classifyEvent(undefined)).toBe('unknown');
  });

  it('recognises batchCreator custom EventBridge cron payload', () => {
    const event = { arguments: { jobType: 'chat-summary-embed' } };
    expect(isBatchCreatorCronEvent(event)).toBe(true);
    expect(classifyEvent(event)).toBe('cron');
  });

  it('does not misclassify a direct-invoke missing __route as AppSync', () => {
    expect(classifyEvent({ arguments: { x: 1 } })).toBe('unknown');
  });
});
