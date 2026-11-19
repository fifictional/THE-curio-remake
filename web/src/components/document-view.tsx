import { Link, useNavigate } from '@tanstack/react-router';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  useAiChat,
  useCreateChat,
  useDeleteDocument,
  useMessages,
} from '../api';
import { Composer, MessageBubble } from './chat-parts';
import { AuthCard } from './auth-card';
import { Markdown } from '../lib/markdown';
import type {
  DocumentRow,
  DocumentSummaryRow,
  FlashcardRow,
  QuizRow,
  SessionUser,
} from '../types';

/**
 * Document page, with the original's tabs: summary, the file itself, its own
 * conversation, flashcards and quizzes. The viewer is the browser's PDF engine
 * through `/files` — no second renderer to maintain, and it degrades to a
 * download link for formats the browser cannot show.
 */

const TABS = ['Summary', 'Document', 'Chat', 'Flashcards', 'Quiz'] as const;
type Tab = (typeof TABS)[number];

function fileUrl(key: string) {
  return `/files?key=${encodeURIComponent(key)}`;
}

function DocumentChat({
  documentUuid,
  fileName,
  initialChatUuid,
}: {
  documentUuid: string;
  fileName: string;
  initialChatUuid: string | null;
}) {
  const [chatUuid, setChatUuid] = useState<string | null>(initialChatUuid);
  const createChat = useCreateChat();
  const messages = useMessages(chatUuid);
  const aiChat = useAiChat(chatUuid ?? '');

  const send = async (text: string) => {
    let target = chatUuid;
    if (!target) {
      target = await createChat.mutateAsync({ name: fileName, documentUuid });
      if (!target) return;
      setChatUuid(target);
    }
    await aiChat.mutateAsync({ chatUuid: target, message: text });
  };

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {!chatUuid && (
          <p className="text-sm text-headers">
            Ask about this document — the conversation is saved with it.
          </p>
        )}
        {chatUuid && messages.isLoading && <p className="text-sm text-headers">Loading…</p>}
        {messages.data?.map((message) => (
          <MessageBubble key={message.messageUuid} message={message} />
        ))}
        {aiChat.isPending && <p className="text-sm text-headers">Curio is thinking…</p>}
        {aiChat.error && (
          <p className="text-sm text-red-600">{(aiChat.error as Error).message}</p>
        )}
        {aiChat.data?.mock && (
          <p className="text-[11px] text-focus-text">
            Mock reply — set OPENAI_API_KEY in .env for a real model.
          </p>
        )}
      </div>

      <div className="mt-3">
        <Composer onSend={send} pending={createChat.isPending || aiChat.isPending} />
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
      {children}
    </section>
  );
}

export function DocumentView({
  user,
  document,
  summary,
  flashcards,
  quizzes,
  chatUuid,
}: {
  user: SessionUser | null;
  document: DocumentRow | null;
  summary: DocumentSummaryRow | null;
  flashcards: FlashcardRow[];
  quizzes: QuizRow[];
  chatUuid: string | null;
}) {
  const navigate = useNavigate();
  const remove = useDeleteDocument();
  const [tab, setTab] = useState<Tab>('Summary');
  const [confirming, setConfirming] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <div className="rounded-2xl border border-chat-panel-border bg-chat-panel p-6">
          <h1 className="text-lg font-semibold text-foreground">Document not found</h1>
          <p className="mt-1 text-sm text-headers">
            It may have been deleted, or it belongs to another account.
          </p>
          <Link to="/library" className="mt-4 inline-block text-sm underline">
            Back to the library
          </Link>
        </div>
      </div>
    );
  }

  const name = document.fileName || 'Untitled document';
  const url = document.key ? fileUrl(document.key) : null;
  const isPdf = (document.type ?? '').includes('pdf') || (document.key ?? '').endsWith('.pdf');

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/library" className="text-xs text-headers underline">
            ← Library
          </Link>
          <h1 className="mt-1 break-words font-roca text-2xl text-foreground">{name}</h1>
          <p className="mt-1 text-xs text-headers">
            {document.createdAt
              ? `Added ${new Date(document.createdAt).toLocaleDateString()}`
              : 'No date recorded'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-xl border border-chat-panel-border bg-chat-panel px-3 py-2 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open file
            </a>
          )}
          {confirming ? (
            <>
              <button
                onClick={async () => {
                  await remove.mutateAsync(document.documentUuid);
                  await navigate({ to: '/library' });
                }}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
              >
                Delete
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm underline">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete document"
              className="rounded-xl border border-chat-panel-border p-2 text-headers hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-black/5">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={[
              'shrink-0 rounded-t-lg px-3 py-2 text-sm',
              tab === item
                ? 'border-b-2 border-foreground font-medium text-foreground'
                : 'text-headers hover:text-foreground',
            ].join(' ')}
          >
            {item}
            {item === 'Flashcards' && flashcards.length > 0 ? ` (${flashcards.length})` : ''}
            {item === 'Quiz' && quizzes.length > 0 ? ` (${quizzes.length})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'Summary' && (
          <Section>
            {summary?.summary ? (
              <Markdown content={summary.summary} />
            ) : (
              <p className="text-sm text-headers">
                No summary yet. The worker writes it a few seconds after upload — reload this
                page. (Scanned PDFs have no text layer, so they produce nothing until OCR is
                added.)
              </p>
            )}
          </Section>
        )}

        {tab === 'Document' && (
          <Section>
            {url && isPdf ? (
              <iframe
                src={url}
                title={name}
                className="h-[70vh] w-full rounded-xl border border-black/5 bg-white"
              />
            ) : (
              <p className="text-sm text-headers">
                {url ? (
                  <>
                    This file type cannot be shown here.{' '}
                    <a href={url} className="underline" target="_blank" rel="noreferrer">
                      Open it instead
                    </a>
                    .
                  </>
                ) : (
                  'No stored file for this document.'
                )}
              </p>
            )}
          </Section>
        )}

        {tab === 'Chat' && (
          <Section>
            <DocumentChat
              documentUuid={document.documentUuid}
              fileName={name}
              initialChatUuid={chatUuid}
            />
          </Section>
        )}

        {tab === 'Flashcards' && (
          <Section>
            <div className="space-y-2">
              {flashcards.slice(0, 100).map((card) => (
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
                <p className="text-sm text-headers">
                  No flashcards saved for this document. Generating them needs the chat tool
                  pipeline, which this build does not have yet.
                </p>
              )}
            </div>
          </Section>
        )}

        {tab === 'Quiz' && (
          <Section>
            <div className="space-y-2">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.quizUuid}
                  className="rounded-lg border border-black/5 bg-white px-3 py-2"
                >
                  <p className="text-sm text-foreground">{quiz.title || 'Untitled quiz'}</p>
                  <p className="text-xs text-headers">
                    {quiz.questionCount ?? 0} question
                    {(quiz.questionCount ?? 0) === 1 ? '' : 's'}
                    {quiz.difficulty ? ` · ${quiz.difficulty}` : ''}
                    {quiz.lastScore != null && quiz.lastTotal != null
                      ? ` · last score ${quiz.lastScore}/${quiz.lastTotal}`
                      : ''}
                  </p>
                </div>
              ))}
              {quizzes.length === 0 && (
                <p className="text-sm text-headers">No quizzes saved for this document yet.</p>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
