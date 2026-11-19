/**
 * Repair Amplify's "JSON string split into a character map" corruption.
 *
 * Two shapes exist in the real data, and some rows are both:
 *   - `{"0":"{","1":"\"","2":"e",…}`  — the payload, split per character
 *   - the same thing again inside the rebuilt string (doubly split), with real
 *     keys like `documentUuid`/`askedCount` added afterwards
 *
 * So repair repeats until the value stops changing, and named keys survive at
 * every level (they win only where the map has nothing).
 */

const NUMERIC = /^\d+$/;
const MAX_ROUNDS = 5;

function once(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

  const keys = Object.keys(payload);
  const numeric = keys.filter((k) => NUMERIC.test(k));
  const named = keys.filter((k) => !NUMERIC.test(k));
  if (numeric.length < 20) return payload;

  const rebuilt = numeric
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (typeof payload[k] === 'string' ? payload[k] : ''))
    .join('');

  const mergeNamed = (value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...Object.fromEntries(named.map((k) => [k, payload[k]])), ...value }
      : { value, ...Object.fromEntries(named.map((k) => [k, payload[k]])) };

  try {
    return mergeNamed(JSON.parse(rebuilt));
  } catch {
    return {
      __unparsed: rebuilt.slice(0, 4000),
      ...Object.fromEntries(named.map((k) => [k, payload[k]])),
    };
  }
}

export function repairPayload(payload) {
  let current = payload;
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const next = once(current);
    if (next === current) break;
    current = next;
  }
  return current;
}
