import { createFileRoute } from '@tanstack/react-router';

import { Library } from '../components/library';
import { loadLibrary } from '../server/api';

export const Route = createFileRoute('/library')({
  loader: () => loadLibrary(),
  component: LibraryPage,
});

function LibraryPage() {
  const data = Route.useLoaderData();
  return <Library user={data.user} documents={data.documents} spaces={data.spaces} />;
}
