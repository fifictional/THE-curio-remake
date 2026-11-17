/**
 * AI provider — OpenAI, via plain fetch (no SDK dependency).
 *
 * Two capabilities, both keyed off `OPENAI_API_KEY`:
 *   - `chat(messages)`  → assistant text
 *   - `embed(text)`     → vector for Qdrant
 *
 * With no key set the server still runs: `chat` returns a deterministic mock
 * reply so the UI and the message pipeline can be exercised offline. That is a
 * development aid, not a fallback for production.
 */

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
export const EMBED_DIMS = 1536;

export const hasAiKey = () => Boolean(process.env.OPENAI_API_KEY);

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chat(turns: ChatTurn[]): Promise<string> {
  if (!hasAiKey()) {
    const last = [...turns].reverse().find((t) => t.role === 'user')?.content ?? '';
    return `[no OPENAI_API_KEY set — mock reply] you said: "${last.slice(0, 120)}"`;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are Curio, a study assistant. Answer clearly and briefly. ' +
            'Use plain language and end with one short follow-up question.',
        },
        ...turns,
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI chat failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Deterministic stand-in for an embedding: same text → same vector, so the
 * retrieval wire format (index → filter → search) is exercisable offline.
 * Semantic quality is NOT claimed — that needs a real key. Same convention as
 * `chat()` returning a mock reply, and as `qdrant:smoke` already documents.
 */
export function pseudoVector(text: string): number[] {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }

  const vector: number[] = [];
  for (let i = 0; i < EMBED_DIMS; i += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    vector.push((seed / 0xffffffff) * 2 - 1);
  }
  return vector;
}

export async function embed(text: string): Promise<number[]> {
  if (!hasAiKey()) return pseudoVector(text);

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vector = json.data?.[0]?.embedding;
  if (!vector) throw new Error('OpenAI embeddings returned no vector');
  return vector;
}
