import { createFileRoute } from '@tanstack/react-router';

import { Metadata } from '../components/metadata';
import { loadMetadata } from '../server/api';

export const Route = createFileRoute('/metadata/$targetId')({
  loader: ({ params }) => loadMetadata({ data: { targetUuid: params.targetId } }),
  component: MetadataPage,
});

function MetadataPage() {
  const data = Route.useLoaderData();
  return <Metadata user={data.user} targetUuid={data.targetUuid} metadata={data.metadata} />;
}
