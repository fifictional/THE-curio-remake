import { Link } from '@tanstack/react-router';

import { Markdown } from '../lib/markdown';
import { AuthCard } from './auth-card';
import type { DocumentRow, DocumentSummaryRow, SessionUser } from '../types';
import { Shell } from './shell';

function fileUrl(key: string) {
  return `/files?key=${encodeURIComponent(key)}`;
}

export function DocumentView({
  user,
  document,
  summary,
}: {
  user: SessionUser | null;
  document: DocumentRow | null;
  summary: DocumentSummaryRow | null;
}) {
  if (!user) {
    return (
      <Shell user={null}>
        <AuthCard />
      </Shell>
    );
  }

  if (!document) {
    return (
      <Shell user={user}>
        <div className="rounded-2xl border border-chat-panel-border bg-chat-panel p-6">
          <h1 className="text-lg font-semibold text-foreground">Document not found</h1>
          <p className="mt-1 text-sm text-headers">
            It may have been deleted, or it belongs to another account.
          </p>
          <Link to="/library" className="mt-4 inline-block text-sm underline">
            Back to the library
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell user={user} wide>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/library" className="text-xs text-headers underline">
            ← Library
          </Link>
          <h1 className="mt-1 break-words font-roca text-2xl text-foreground">
            {document.fileName || 'Untitled document'}
          </h1>
          <p className="mt-1 text-xs text-headers">
            {document.createdAt
              ? `Added ${new Date(document.createdAt).toLocaleDateString()}`
              : 'No date recorded'}
          </p>
        </div>

        {document.key && (
          <a
            href={fileUrl(document.key)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-chat-panel-border bg-chat-panel px-3 py-2 text-sm"
          >
            Open file ↗
          </a>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
          Summary
        </h2>

        {summary?.summary ? (
          <>
            <Markdown content={summary.summary} />
            {summary.status && summary.status !== 'completed' && (
              <p className="mt-3 text-xs text-headers">Status: {summary.status}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-headers">
            No summary yet. The worker writes it a few seconds after upload — reload this
            page. (Scanned PDFs have no text layer, so they produce nothing until OCR is
            added.)
          </p>
        )}
      </section>
    </Shell>
  );
}
