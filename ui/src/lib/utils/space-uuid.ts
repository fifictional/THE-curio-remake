/**
 * Query params and template strings often produce the literal "undefined" / "null".
 * Treat those as absent so we do not persist invalid space foreign keys.
 */
export function parseOptionalSpaceUuid(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t || t === 'undefined' || t === 'null') return null;
  return t;
}
