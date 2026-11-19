/**
 * Datalab OCR: the seam is exercised with a mocked fetch, because the point is
 * the behaviour without a key and the two response shapes, not the service.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { datalabConfigured, ocrPdf } from './ocr';

const bytes = new Uint8Array([37, 80, 68, 70]);
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.DATALAB_API_KEY;
});

describe('ocrPdf', () => {
  it('does nothing without a key', async () => {
    expect(datalabConfigured()).toBe(false);
    expect(await ocrPdf(bytes)).toBeNull();
  });

  it('returns markdown from an inline response', async () => {
    process.env.DATALAB_API_KEY = 'test-key';
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ markdown: '# Page one\n\nText' }))) as never;

    expect(await ocrPdf(bytes)).toBe('# Page one\n\nText');
  });

  it('polls when the service only returns a check url', async () => {
    process.env.DATALAB_API_KEY = 'test-key';
    process.env.DATALAB_POLL_MS = '1';

    let calls = 0;
    global.fetch = vi.fn(async (url: string | URL) => {
      calls += 1;
      if (String(url).includes('check')) {
        return new Response(JSON.stringify({ status: 'complete', markdown: 'polled text' }));
      }
      return new Response(JSON.stringify({ request_check_url: 'https://datalab.test/check/1' }));
    }) as never;

    expect(await ocrPdf(bytes)).toBe('polled text');
    expect(calls).toBe(2);
  });

  it('gives up quietly on an HTTP failure', async () => {
    process.env.DATALAB_API_KEY = 'test-key';
    global.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as never;

    expect(await ocrPdf(bytes)).toBeNull();
  });
});
