import { createFileRoute } from '@tanstack/react-router';

import { DocumentView } from '../components/document-view';
import { loadDocument } from '../server/api';

export const Route = createFileRoute('/documents/$documentUuid')({
  loader: ({ params }) => loadDocument({ data: { documentUuid: params.documentUuid } }),
  component: DocumentPage,
});

function DocumentPage() {
  const data = Route.useLoaderData();
  return (
    <DocumentView
      user={data.user}
      document={data.document}
      summary={data.summary}
      flashcards={data.flashcards}
      quizzes={data.quizzes}
      chatUuid={data.chatUuid}
    />
  );
}
