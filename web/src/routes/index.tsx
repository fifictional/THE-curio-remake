import { createFileRoute } from '@tanstack/react-router';

import App from '../components/chat-app';
import { loadChatPage } from '../server/api';

/**
 * SSR: the loader runs on the server, forwards the session cookie to the API and
 * hands the first paint its data. No `ssr: false`, no empty shell, no spinner on
 * a slow connection before the conversation appears.
 */
export const Route = createFileRoute('/')({
  // `?chat=<uuid>` deep-links a conversation (used by the space pages).
  validateSearch: (search: Record<string, unknown>) => ({
    chat: typeof search.chat === 'string' && search.chat ? search.chat : undefined,
  }),
  loaderDeps: ({ search }) => ({ chat: search.chat }),
  loader: ({ deps }) => loadChatPage({ data: { chatUuid: deps.chat } }),
  component: ChatPage,
});

function ChatPage() {
  return <App initial={Route.useLoaderData()} />;
}
