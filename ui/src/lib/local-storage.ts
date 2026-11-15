/**
 * Amplify Storage shim — S3 replaced by the API's /files endpoint.
 *
 * Only what the document flow uses: `uploadData`, `downloadData`,
 * `getProperties`. Same return shapes as @aws-amplify/storage so call sites do
 * not change.
 */

const API = '';

export function uploadData(input: { data: Blob | File | string; path: string; options?: { contentType?: string } }) {
  const run = async () => {
    const res = await fetch(`${API}/files?key=${encodeURIComponent(input.path)}`, {
      method: 'POST',
      credentials: 'include',
      headers: input.options?.contentType ? { 'content-type': input.options.contentType } : undefined,
      body: input.data as BodyInit,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const body = (await res.json()) as { key: string; size: number };
    return { path: body.key, size: body.size };
  };

  return { result: run() };
}

export async function downloadData(input: { path: string }) {
  const res = await fetch(`${API}/files?key=${encodeURIComponent(input.path)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return { body: await res.blob() };
}

export async function getProperties(input: { path: string }) {
  const res = await fetch(`${API}/files?key=${encodeURIComponent(input.path)}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Not found (${res.status})`);
  const blob = await res.blob();
  return { path: input.path, size: blob.size, contentType: blob.type };
}

/**
 * `getUrl` replacement: locally the object is served straight from /files, so
 * "presigning" is just URL construction.
 */
export async function getUrl(input: { path: string }) {
  return {
    url: new URL(
      `/files?key=${encodeURIComponent(input.path)}`,
      typeof window === 'undefined' ? 'http://localhost:3200' : window.location.origin,
    ),
  };
}

/** `remove` replacement: delete the object from local storage. */
export async function remove(input: { path: string }) {
  await fetch(`/files?key=${encodeURIComponent(input.path)}`, {
    method: 'DELETE',
    credentials: 'include',
  }).catch(() => {});
}
