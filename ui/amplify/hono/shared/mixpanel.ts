/**
 * Mixpanel thin re-export for Hono routes.
 *
 * Re-exports `getMixpanel` from the existing utility at
 * `amplify/utils/mixpanel.ts` so route handlers can import from one stable
 * location:
 *
 * ```ts
 * import { getMixpanel } from '../../shared/mixpanel';
 * const mp = await getMixpanel();
 * mp?.track('event_name', { distinct_id: userId, ... });
 * ```
 *
 * IMPORTANT DESIGN DECISION (2026-05-28):
 *
 * The original §10.3 P1-9 plan was a middleware that auto-tracks every AppSync
 * invocation. The 2026-05-28 audit of `amplify/functions/*` found that today
 * only ~5 specific Lambdas call Mixpanel (`ai-chat`, `subscription-update`,
 * `transaction-completed`, `process-document-update-task-status`,
 * `process-document-categorise`), each with bespoke event names and
 * properties.
 *
 * A blanket "track every Hono invocation" middleware would therefore be NEW
 * product behaviour, not migration-equivalent, and risks polluting Mixpanel
 * with millions of low-signal events (cron, direct-invoke pipeline ticks,
 * Neptune internal queries). We defer that decision and only mirror the
 * existing per-route opt-in pattern.
 *
 * Also: 2 of those 5 Lambdas (`process-document-update-task-status`,
 * `process-document-categorise`) don't currently bind `MIXPANEL_TOKEN` in
 * their `resource.ts`, so their `getMixpanel()` calls silently no-op in prod.
 * When those Lambdas migrate, we must add `MIXPANEL_TOKEN` to the relevant
 * Hono Lambda's env (likely Hono-Heavy for process-document-categorise's path,
 * Hono-Light otherwise) — tracked in PF-15 to add as a pre-migration TODO.
 */

export { getMixpanel } from '../../utils/mixpanel';
