import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';

import type { DocumentRow, SessionUser, SpaceRow } from '../types';
import { AuthCard } from './auth-card';
import { Shell } from './shell';

/** `POST /files` then `POST /documents`: the browser uploads, the worker summarises. */
function useUploadDocument(userSub: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!userSub) throw new Error('Not signed in');

      const documentUuid = crypto.randomUUID();
      const suffix = file.name.includes('.') ? file.name.split('.').pop() : '';
      const fileName = `uploadedFile${suffix ? `.${suffix}` : ''}`;
      const key = `student-documents/${userSub}/${documentUuid}/${fileName}`;

      const upload = await fetch(`/files?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        body: file,
      });
      if (!upload.ok) throw new Error(`Upload failed (${upload.status})`);

      // `/api/documents` rather than `/documents`: the latter prefix also holds
      // this app's own document pages, so the dev proxy must not swallow it.
      const created = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          documentUuid,
          originalKey: key,
          fileName: file.name,
          type: file.type || 'file',
        }),
      });
      if (!created.ok) throw new Error(`Could not create the document (${created.status})`);

      return { documentUuid };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

const typeLabel = (type?: string | null) => {
  if (!type) return 'file';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('youtube')) return 'Video';
  const ext = type.split('/').pop();
  return (ext ?? type).toUpperCase();
};

function DocumentCard({ document }: { document: DocumentRow }) {
  return (
    <Link
      to="/documents/$documentUuid"
      params={{ documentUuid: document.documentUuid }}
      className="flex items-center justify-between gap-4 rounded-xl border border-chat-panel-border bg-chat-panel px-4 py-3 hover:border-curio-green/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {document.fileName || 'Untitled document'}
        </p>
        <p className="text-xs text-headers">
          {typeLabel(document.type)}
          {document.createdAt
            ? ` · ${new Date(document.createdAt).toLocaleDateString()}`
            : ''}
        </p>
      </div>
      <span className="shrink-0 text-xs text-headers">Open →</span>
    </Link>
  );
}

export function Library({
  user,
  documents: initialDocuments,
  spaces,
}: {
  user: SessionUser | null;
  documents: DocumentRow[];
  spaces: SpaceRow[];
}) {
  const [query, setQuery] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(user?.sub ?? null);

  const documents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initialDocuments;
    return initialDocuments.filter((d) =>
      (d.fileName ?? '').toLowerCase().includes(needle),
    );
  }, [initialDocuments, query]);

  // Hooks first: an early return above them would break the rules of hooks.
  if (!user) {
    return (
      <Shell user={null}>
        <AuthCard />
      </Shell>
    );
  }

  return (
    <Shell user={user} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-roca text-2xl text-foreground">Your library</h1>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-56 rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
          />
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="rounded-xl bg-curio-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {upload.error && (
        <p className="mt-3 text-sm text-red-600">{(upload.error as Error).message}</p>
      )}
      {upload.isSuccess && (
        <p className="mt-3 text-sm text-headers">
          Uploaded. The worker is extracting the text and writing a summary — it will
          appear here in a few seconds.
        </p>
      )}

      {spaces.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-headers">Folders</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {spaces.map((space) => (
              <Link
                key={space.spaceUuid}
                to="/spaces/$spaceId"
                params={{ spaceId: space.spaceUuid }}
                className="rounded-full border border-chat-panel-border bg-chat-panel px-3 py-1 text-sm text-foreground hover:border-curio-green/40"
              >
                {space.name || 'Untitled folder'}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs uppercase tracking-wide text-headers">
        {documents.length} document{documents.length === 1 ? '' : 's'}
        {spaces.length ? ` · ${spaces.length} folder${spaces.length === 1 ? '' : 's'}` : ''}
      </p>

      <div className="mt-3 grid gap-2">
        {documents.map((document) => (
          <DocumentCard key={document.documentUuid} document={document} />
        ))}
        {documents.length === 0 && (
          <p className="rounded-xl border border-dashed border-chat-panel-border p-6 text-center text-sm text-headers">
            {query ? 'No documents match that search.' : 'Nothing here yet — upload a PDF to start.'}
          </p>
        )}
      </div>
    </Shell>
  );
}
