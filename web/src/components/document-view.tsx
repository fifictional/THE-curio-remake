import { Link } from '@tanstack/react-router';

import { Markdown } from '../lib/markdown';
import { AuthCard } from './auth-card';
import type {
  DocumentRow,
  DocumentSummaryRow,
  FlashcardRow,
  QuizRow,
  SessionUser,
} from '../types';
import { Shell } from './shell';

function fileUrl(key: string) {
  return `/files?key=${encodeURIComponent(key)}`;
}

function StudyMaterial({
  flashcards,
  quizzes,
}: {
  flashcards: FlashcardRow[];
  quizzes: QuizRow[];
}) {
  return (
    <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
        Study material
      </h2>
      <p className="mb-4 text-xs text-headers">
        Read-only: generating new cards and quizzes is not part of this build.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Flashcards {flashcards.length ? `(${flashcards.length})` : ''}
          </h3>
          <div className="mt-2 space-y-2">
            {flashcards.slice(0, 20).map((card) => (
              <details
                key={card.flashcardUuid}
                className="rounded-lg border border-black/5 bg-white px-3 py-2"
              >
                <summary className="cursor-pointer text-sm text-foreground">
                  {card.title || 'Card'}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-paragraphs">
                  {card.content}
                </p>
              </details>
            ))}
            {flashcards.length === 0 && (
              <p className="text-sm text-headers">No flashcards saved for this document.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Quizzes {quizzes.length ? `(${quizzes.length})` : ''}
          </h3>
          <div className="mt-2 space-y-2">
            {quizzes.map((quiz) => (
              <div
                key={quiz.quizUuid}
                className="rounded-lg border border-black/5 bg-white px-3 py-2"
              >
                <p className="text-sm text-foreground">{quiz.title || 'Untitled quiz'}</p>
                <p className="text-xs text-headers">
                  {quiz.questionCount ?? 0} question{(quiz.questionCount ?? 0) === 1 ? '' : 's'}
                  {quiz.difficulty ? ` · ${quiz.difficulty}` : ''}
                  {quiz.lastScore != null && quiz.lastTotal != null
                    ? ` · last score ${quiz.lastScore}/${quiz.lastTotal}`
                    : ''}
                </p>
              </div>
            ))}
            {quizzes.length === 0 && (
              <p className="text-sm text-headers">No quizzes saved for this document.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DocumentView({
  user,
  document,
  summary,
  flashcards,
  quizzes,
}: {
  user: SessionUser | null;
  document: DocumentRow | null;
  summary: DocumentSummaryRow | null;
  flashcards: FlashcardRow[];
  quizzes: QuizRow[];
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

      <StudyMaterial flashcards={flashcards} quizzes={quizzes} />
    </Shell>
  );
}
