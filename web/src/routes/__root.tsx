import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import appCss from '../index.css?url';
import { AppShell } from '../components/app-shell';
import { NotFound, RouteError } from '../components/states';
import { loadShell } from '../server/api';

export const Route = createRootRoute({
  // One load for the sidebar; pages keep their own data loaders.
  loader: () => loadShell(),
  staleTime: 30_000,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Curio' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});

/**
 * One QueryClient per request/render tree — created in an initialiser so it is
 * not recreated on re-render (and not shared between server requests).
 */
function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } },
      }),
  );

  const shell = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell
        user={shell?.user ?? null}
        chats={shell?.chats ?? []}
        documents={shell?.documents ?? []}
        spaces={shell?.spaces ?? []}
      >
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
