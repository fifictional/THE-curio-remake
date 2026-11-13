/**
 * Local data client — the BRIDGE, frontend side.
 *
 * The original Curio UI calls `client.models.<Model>.<method>(args, options)`.
 * Under Amplify that was a GraphQL request to AppSync. Here the same call is
 * forwarded to the new API's `POST /db` endpoint, which answers it from
 * Postgres under row-level security.
 *
 * Why a Proxy: the generated Amplify client has hundreds of members
 * (`listMessageByChatUuidAndCreatedAt`, `onCreate`, …). Enumerating them would
 * be a copy of Amplify's codegen. A Proxy forwards any name, so the original
 * components stay untouched.
 *
 * Subscriptions (`onCreate` / `onUpdate` / `onDelete`) are stubbed: the new
 * stack polls instead of pushing. They return a no-op observer so the UI does
 * not crash, and screens re-fetch after a mutation.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

interface AmplifyResult<T = unknown> {
  data: T | null;
  errors?: Array<{ message: string }>;
}

async function callDb(model: string, method: string, args: unknown, options?: unknown) {
  const res = await fetch(`${API}/db`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ model, method, args, options }),
  });
  return (await res.json()) as AmplifyResult;
}

async function callOperation(name: string, args: unknown) {
  const res = await fetch(`${API}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(args ?? {}),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.success === false) {
    return { data: null, errors: [{ message: String(body.error ?? `HTTP ${res.status}`) }] };
  }
  return { data: body, errors: [] };
}

const noopSubscription = {
  subscribe: () => ({ unsubscribe: () => {} }),
};

function modelClient(model: string) {
  return new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === 'onCreate' || method === 'onUpdate' || method === 'onDelete') {
          return () => noopSubscription;
        }
        return (args?: unknown, options?: unknown) => callDb(model, method, args, options);
      },
    },
  );
}

function operationClient(kind: 'queries' | 'mutations') {
  return new Proxy(
    {},
    {
      get(_target, name: string) {
        return (args?: unknown) => callOperation(name, args);
      },
    },
  );
}

export function createLocalClient() {
  const models = new Proxy(
    {},
    {
      get(_target, model: string) {
        return modelClient(model);
      },
    },
  );

  return {
    models,
    queries: operationClient('queries'),
    mutations: operationClient('mutations'),
    graphql: async () => ({ data: null, errors: [{ message: 'graphql() not supported locally' }] }),
    // Amplify's client exposes these; a few call sites reference them.
    configure: () => {},
    graphqlEndpoint: API,
  };
}

export type LocalClient = ReturnType<typeof createLocalClient>;
