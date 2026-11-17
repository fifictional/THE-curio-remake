import { createFileRoute } from '@tanstack/react-router';

import { ResetPassword } from '../components/password';

export const Route = createFileRoute('/reset')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' && search.token ? search.token : undefined,
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => ({ token: deps.token ?? null }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useLoaderData();
  return <ResetPassword token={token} />;
}
