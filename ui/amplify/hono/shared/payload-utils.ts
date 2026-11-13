/**
 * Payload helpers for routes with non-standard invoke shapes.
 *
 * `embedSpaceFlashcards` is invoked three ways today:
 *   1. AppSync — `{ spaceUuid, userUuid }` serialized as the Hono request body
 *   2. Direct-invoke adapter — same fields in `event.arguments` → body
 *   3. Legacy Lambda invoke from `moveDocument` — top-level `{ spaceUuid, userUuid }`
 *      without `__route` (still targets the standalone Lambda until Phase 5 cutover;
 *      the Hono route accepts this shape for parity when the invoke target switches)
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-5.
 */

export function extractSpaceUserArgs(raw: unknown): {
  spaceUuid?: string;
  userUuid?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const nested =
    record.arguments && typeof record.arguments === 'object'
      ? (record.arguments as Record<string, unknown>)
      : null;

  const spaceUuid = nested?.spaceUuid ?? record.spaceUuid;
  const userUuid = nested?.userUuid ?? record.userUuid;

  return {
    spaceUuid: typeof spaceUuid === 'string' ? spaceUuid : undefined,
    userUuid: typeof userUuid === 'string' ? userUuid : undefined,
  };
}
