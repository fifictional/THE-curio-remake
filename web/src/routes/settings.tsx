import { createFileRoute } from '@tanstack/react-router';

import { Settings } from '../components/settings';
import { loadSettings } from '../server/api';

export const Route = createFileRoute('/settings')({
  loader: () => loadSettings(),
  component: SettingsPage,
});

function SettingsPage() {
  const data = Route.useLoaderData();
  return <Settings user={data.user} profile={data.profile} />;
}
