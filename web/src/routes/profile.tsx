import { createFileRoute } from '@tanstack/react-router';

import { Profile } from '../components/profile';
import { loadProfile } from '../server/api';

export const Route = createFileRoute('/profile')({
  loader: () => loadProfile(),
  component: ProfilePage,
});

function ProfilePage() {
  const data = Route.useLoaderData();
  return <Profile user={data.user} profile={data.profile} subscription={data.subscription} />;
}
