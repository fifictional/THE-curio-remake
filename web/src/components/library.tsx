import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { FolderPlus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { useCreateSpace, useMoveDocument } from '../api';
import type { DocumentRow, SessionUser, SpaceRow } from '../types';
import { AuthCard } from './auth-card';

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

function DocumentCard({
  document,
  spaces,
  onMove,
}: {
  document: DocumentRow;
  spaces: SpaceRow[];
  onMove: (spaceUuid: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-chat-panel-border bg-chat-panel px-4 py-3 hover:border-curio-green/40">
      <Link
        to="/documents/$documentUuid"
        params={{ documentUuid: document.documentUuid }}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium text-foreground">
          {document.fileName || 'Untitled document'}
        </p>
        <p className="text-xs text-headers">
          {typeLabel(document.type)}
          {document.createdAt
            ? ` · ${new Date(document.createdAt).toLocaleDateString()}`
            : ''}
        </p>
      </Link>

      <label className="shrink-0 text-xs text-headers">
        <span className="sr-only">Move to folder</span>
        <select
          value={document.spaceUuid ?? ''}
          onChange={(e) => onMove(e.target.value || null)}
          className="max-w-[11rem] rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-foreground"
        >
          <option value="">Unfiled</option>
          {spaces.map((space) => (
            <option key={space.spaceUuid} value={space.spaceUuid}>
              {space.name || 'Untitled folder'}
            </option>
          ))}
        </select>
      </label>

      <Link
        to="/documents/$documentUuid"
        params={{ documentUuid: document.documentUuid }}
        className="shrink-0 text-xs text-headers"
      >
        Open →
      </Link>
    </div>
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
  const [newFolder, setNewFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(user?.sub ?? null);
  const createSpace = useCreateSpace();
  const moveDocument = useMoveDocument();
  const router = useRouter();

  const refresh = () => {
    void router.invalidate();
  };

  const documents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initialDocuments;
    return initialDocuments.filter((d) =>
      (d.fileName ?? '').toLowerCase().includes(needle),
    );
  }, [initialDocuments, query]);

  const unfiled = documents.filter((doc) => !doc.spaceUuid);

  // Hooks first: an early return above them would break the rules of hooks.
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
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

      {/* Folders: create one here, and see how many documents are in each. */}
      <div className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-headers">Folders</p>
          {creating ? (
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const name = newFolder.trim();
                if (!name) return;
                await createSpace.mutateAsync(name);
                setNewFolder('');
                setCreating(false);
                refresh();
              }}
            >
              <input
                autoFocus
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Folder name"
                className="w-44 rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-curio-green/20"
              />
              <button
                type="submit"
                disabled={createSpace.isPending || !newFolder.trim()}
                className="rounded-lg bg-curio-green px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewFolder('');
                }}
                className="text-xs text-headers underline"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-xs text-foreground underline"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {spaces.map((space) => {
            const count = initialDocuments.filter((d) => d.spaceUuid === space.spaceUuid).length;
            return (
              <Link
                key={space.spaceUuid}
                to="/spaces/$spaceId"
                params={{ spaceId: space.spaceUuid }}
                className="rounded-xl border border-chat-panel-border bg-white px-3 py-2 text-sm text-foreground hover:border-curio-green/40"
              >
                {space.name || 'Untitled folder'}
                <span className="ml-1 text-xs text-headers">{count}</span>
              </Link>
            );
          })}
          {spaces.length === 0 && (
            <p className="text-sm text-headers">
              No folders yet — create one, then file documents into it with the selector on
              each row.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs uppercase tracking-wide text-headers">
        {documents.length} document{documents.length === 1 ? '' : 's'}
        {spaces.length ? ` · ${spaces.length} folder${spaces.length === 1 ? '' : 's'}` : ''}
      </p>

      <div className="mt-3 space-y-6">
        {spaces.map((space) => {
          const inFolder = documents.filter((d) => d.spaceUuid === space.spaceUuid);
          if (inFolder.length === 0) return null;
          return (
            <section key={space.spaceUuid}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                {space.name || 'Untitled folder'}
                <span className="text-xs font-normal text-headers">{inFolder.length}</span>
              </h2>
              <div className="grid gap-2">
                {inFolder.map((document) => (
                  <DocumentCard
                    key={document.documentUuid}
                    document={document}
                    spaces={spaces}
                    onMove={async (spaceUuid) => {
                      await moveDocument.mutateAsync({ documentUuid: document.documentUuid, spaceUuid });
                      refresh();
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section>
          {spaces.length > 0 && (
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Unfiled
              <span className="ml-2 text-xs font-normal text-headers">{unfiled.length}</span>
            </h2>
          )}
          <div className="grid gap-2">
            {unfiled.map((document) => (
              <DocumentCard
                key={document.documentUuid}
                document={document}
                spaces={spaces}
                onMove={async (spaceUuid) => {
                  await moveDocument.mutateAsync({ documentUuid: document.documentUuid, spaceUuid });
                  refresh();
                }}
              />
            ))}
          </div>
        </section>

        {documents.length === 0 && (
          <p className="rounded-xl border border-dashed border-chat-panel-border p-6 text-center text-sm text-headers">
            {query ? 'No documents match that search.' : 'Nothing here yet — upload a PDF to start.'}
          </p>
        )}
      </div>
    </div>
  );
}
