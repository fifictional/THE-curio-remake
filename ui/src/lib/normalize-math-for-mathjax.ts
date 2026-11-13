/**
 * MathJax in this app is configured for \(...\) and \[...\] delimiters only
 * (see providers.tsx). Model output often uses "(8\\pi)" or bare "\\pi",
 * which MathJax ignores. Normalize those patterns so formulas render.
 */
export function normalizeMathForMathJax(input: string): string {
  if (!input) return input;

  return input.split(/(```[\s\S]*?```)/g).map((chunk, i) => {
    if (i % 2 === 1) return chunk;
    return normalizeChunk(chunk);
  }).join("");
}

function normalizeChunk(s: string): string {
  // "radius (r = 4)" -> "radius \(r = 4\)" — keeps the value on one line for MathJax
  let out = s.replace(/\(r\s*=\s*([+-]?\d+(?:\.\d+)?)\)/gi, "\\(r = $1\\)");

  if (!out.includes("\\")) return out;

  // Whole line is "( ... )" with at least one LaTeX command — typical MC option shape "(8\pi)"
  const trimmed = out.trim();
  if (
    trimmed.startsWith("(") &&
    trimmed.endsWith(")") &&
    /\\[a-zA-Z]/.test(trimmed) &&
    !/[()]/.test(trimmed.slice(1, -1))
  ) {
    const inner = trimmed.slice(1, -1);
    if (out.trim() === trimmed) {
      out = `\\(${inner}\\)`;
    } else {
      out = out.replace(trimmed, `\\(${inner}\\)`);
    }
  }

  // Short single-line fragment still has bare \alpha, \pi, etc. and no explicit math delimiters
  if (
    !out.includes("\\(") &&
    !out.includes("\\[") &&
    !out.includes("$$") &&
    /\\[a-zA-Z]/.test(out) &&
    out.length <= 280 &&
    !out.includes("\n")
  ) {
    out = `\\(${out.trim()}\\)`;
  }

  return out;
}
