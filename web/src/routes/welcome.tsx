import { createFileRoute, redirect } from '@tanstack/react-router';

import { Welcome } from '../components/welcome';
import { AuthCard } from '../components/auth-card';
import { loadWelcome } from '../server/api';

export const Route = createFileRoute('/welcome')({
  loader: async () => {
    const data = await loadWelcome();
    // Already onboarded: no reason to walk through it again.
    if (data.user?.onboardingCompleted) throw redirect({ to: '/', search: { chat: undefined } });
    return data;
  },
  component: WelcomePage,
});

function WelcomePage() {
  const data = Route.useLoaderData();
  if (!data.user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }
  return <Welcome user={data.user} firstName={data.firstName} />;
}
