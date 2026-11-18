/** A malformed id in a URL is a "not found", not a 500 — this is the guard. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string | undefined | null): value is string =>
  typeof value === 'string' && UUID.test(value);
