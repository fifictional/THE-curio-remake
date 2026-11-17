/**
 * Server-only fetch: forwards the incoming session cookie to the API.
 *
 * File ends in `.server.ts` on purpose — TanStack Start's import protection keeps
 * it out of the client bundle, and `getRequestHeaders()` is only valid while a
 * request is being handled.
 */

import { getRequestHeaders } from '@tanstack/react-start/server';

const ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3101';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  headers.set('cookie', getRequestHeaders().get('cookie') ?? '');

  const res = await fetch(`${ORIGIN}${path}`, { ...init, headers });

  // Signed out, or a chat this user cannot see: both are normal, not errors.
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}
