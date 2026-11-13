/**
 * Direct-invoke → Hono adapter.
 *
 * Handles Lambda → Lambda direct-invoke payloads, today only from the
 * ProcessDocument dispatcher per PF-1 Option C-lite. The payload shape is:
 *
 *   {
 *     __route: 'ai-chat' | 'mock-exams-generate-questions' | 'generate-questions',
 *     arguments: { ... }  // route-specific args
 *   }
 *
 * The adapter converts this to a synthetic `POST /<__route>` request,
 * dispatches it to the Hono app, and unwraps the response into a plain JS
 * value that `lambda.invoke` returns to the dispatcher.
 *
 * Unlike the AppSync adapter, this path has NO identity context — the
 * dispatcher calls `lambda.invoke` with IAM, not with a Cognito user. Routes
 * downstream that need user identity (like `ai-chat`) must read `userUuid`
 * from `arguments` (the dispatcher's `args` already include this).
 *
 * Error handling: on non-2xx response, return `{ success: false, error: ... }`
 * rather than throwing — the dispatcher inspects `result.StatusCode` (which
 * is the Lambda invocation status, always 200 if the handler completed) and
 * relies on the response body to know if the route succeeded.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §6.5.1 (PF-1).
 */

import type { Hono } from 'hono';
import type { Context } from 'aws-lambda';
import type { DirectInvokeEvent } from './event-discriminator';
import type { HonoEnv } from './types';

export function directInvokeAdapter(app: Hono<HonoEnv>) {
  return async (event: DirectInvokeEvent, context: Context): Promise<unknown> => {
    const path = `/${event.__route.replace(/^\/+/, '')}`;
    const url = `https://hono-internal.local${path}`;

    const request = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-direct-invoke-route': event.__route,
        'x-aws-request-id': context.awsRequestId,
        'x-invocation-type': 'direct',
      },
      body: JSON.stringify(event.arguments ?? {}),
    });

    let response: Response;
    try {
      response = await app.fetch(request, {});
    } catch (err) {
      // Catastrophic failure (app.fetch threw before reaching error boundary).
      // Mirror the existing dispatcher convention: return success=false so
      // dispatch.ts can decide retry vs. terminal.
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Hono app threw during direct-invoke dispatch to ${path}: ${message}`,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => '');
    }

    if (response.status >= 400) {
      // Pass through a structured error body if the route already returned one
      // (validate middleware, route-level 4xx responses, etc.). Only construct
      // a generic envelope when the body has no `error` field.
      if (body && typeof body === 'object' && 'error' in body) {
        const passthrough = body as Record<string, unknown>;
        return {
          ...passthrough,
          success: passthrough.success === false ? false : false,
          error: String(passthrough.error),
          status: response.status,
        };
      }
      return {
        success: false,
        error: `Hono route ${path} returned status ${response.status}`,
        status: response.status,
      };
    }

    // 2xx — return the body directly. Existing ProcessDocument dispatcher
    // doesn't currently inspect the body (it only checks StatusCode), so
    // shape is uncoupled from caller — but routes should still return
    // structured JSON for future use (logging, retry decisions, etc.).
    return body;
  };
}
