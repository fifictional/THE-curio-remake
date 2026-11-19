import { createFileRoute } from '@tanstack/react-router';

import { Space } from '../components/space';
import { loadSpace } from '../server/api';

export const Route = createFileRoute('/spaces/$spaceId')({
  loader: ({ params }) => loadSpace({ data: { spaceId: params.spaceId } }),
  component: SpacePage,
});

function SpacePage() {
  const data = Route.useLoaderData();
  return (
    <Space
      user={data.user}
      space={data.space}
      chats={data.chats}
      documents={data.documents}
      members={data.members}
      myLevel={data.myLevel}
    />
  );
}
