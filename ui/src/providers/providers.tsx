'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AmplifyProvider, AnalyticsProvider, ChatProvider, CommonProvider, CoreProvider, SessionProvider, SpaceProvider } from '@/providers';
import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { MathJaxContext } from 'better-react-mathjax';
import type { MathJax3Object } from 'better-react-mathjax';
import * as Sentry from '@sentry/nextjs';

// Normalize any thrown value (including raw Amplify `{ errors: [...] }`
// responses) into a real Error so Sentry stack traces are meaningful and
// React Query doesn't leak `Uncaught {errors: Array(1)}` rejections.
function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const anyErr = err as { errors?: Array<{ message?: string }>; message?: string };
    const msg =
      anyErr.errors?.[0]?.message ||
      anyErr.message ||
      (() => {
        try { return JSON.stringify(err); } catch { return 'Unknown error'; }
      })();
    const wrapped = new Error(msg);
    (wrapped as Error & { cause?: unknown }).cause = err;
    return wrapped;
  }
  return new Error(typeof err === 'string' ? err : 'Unknown error');
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Amplify Data errors are usually not transient; fewer retries = less
        // Sentry spam and less chance of hitting the 429 ingest limit.
        retry: 1,
        // The remake serves data from a 2-second server-side cache, so a short
        // client stale window removes the duplicate fetch storms (the legacy UI
        // asks for the same lists repeatedly while rendering).
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        const normalized = normalizeError(err);
        console.error('[react-query] query failed', {
          queryKey: query.queryKey,
          err: normalized,
        });
        Sentry.captureException(normalized, {
          tags: { scope: 'react-query', kind: 'query' },
          extra: { queryKey: query.queryKey },
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        const normalized = normalizeError(err);
        console.error('[react-query] mutation failed', {
          mutationKey: mutation.options.mutationKey,
          err: normalized,
        });
        Sentry.captureException(normalized, {
          tags: { scope: 'react-query', kind: 'mutation' },
          extra: { mutationKey: mutation.options.mutationKey },
        });
      },
    }),
  });
}

const MathJaxConfig = {
  loader: { load: ["[tex]/html", "[tex]/textmacros"] },
  tex: {
    packages: { "[+]": ["html", "textmacros"] },
    inlineMath: [ 
//      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"]
    ],
    processEscapes: true,
    processEnvironments: true
  },
  options: {
    enableMenu: false,
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    ignoreHtmlClass: 'tex2jax_ignore'
  },
  renderMode: 'post'
}

/**
 * MathJax is served from public/mathjax (copied from node_modules by
 * `npm run mathjax:copy`, wired into postinstall) instead of the CDN: the CDN is
 * unreachable on some networks, which made every message log
 * "Typesetting failed". Set NEXT_PUBLIC_DISABLE_MATHJAX=1 to skip it entirely,
 * but note the MathJax components in message rendering require the context.
 */
const MATHJAX_SRC = process.env.NEXT_PUBLIC_MATHJAX_SRC ?? '/mathjax/es5/tex-mml-chtml.js';

/**
 * MathJax v3 does not support concurrent typesetting. better-react-mathjax
 * issues one `typesetPromise` per <MathJax> element, so a document page (or a
 * chat with a few dozen messages) starts every call at once; the losers throw
 * "Typesetting failed: Cannot read properties of null (reading 'nextSibling')"
 * and their maths stays as raw LaTeX. MathJax's own advice is to serialise the
 * calls, so this queue does exactly that and nothing else.
 */
function serializeTypesetting(mathJax: MathJax3Object) {
  const install = (target: unknown) => {
    const mj = target as { typesetPromise?: (elements: unknown[]) => Promise<unknown> };
    const typeset = mj.typesetPromise;
    if (typeof typeset !== 'function') return;

    let queue: Promise<unknown> = Promise.resolve();
    mj.typesetPromise = (elements: unknown[]) => {
      const next = queue.then(() => typeset.call(mj, elements));
      queue = next.catch(() => {
        /* one failed block must not stall the queue */
      });
      return next;
    };
  };

  // `onStartup` fires on script load, which is *before* MathJax has finished
  // starting up: typesetPromise exists, but the startup promise is the point
  // after which it is safe. Patch on both, and once more when startup resolves
  // (its resolution value is void, so the target is captured here).
  install(mathJax);
  const startup = (mathJax as unknown as { startup?: { promise?: Promise<unknown> } }).startup;
  startup?.promise?.then(() => install(mathJax)).catch(() => {});
}

function WithMathJax({ children }: { children: React.ReactNode }) {
  return (
    <MathJaxContext
      version={3}
      src={MATHJAX_SRC}
      config={MathJaxConfig}
      onStartup={serializeTypesetting}
    >
      {children}
    </MathJaxContext>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <Theme asChild>
      <AnalyticsProvider>
        <WithMathJax>
          <QueryClientProvider client={queryClient}>
            <Authenticator.Provider>
              <AmplifyProvider>
                <SessionProvider>
                  <CommonProvider>
                    <SpaceProvider>
                      <CoreProvider>
                        <ChatProvider>
                          <TooltipProvider>
                            {children}
                          </TooltipProvider>
                        </ChatProvider>
                      </CoreProvider>
                    </SpaceProvider>
                  </CommonProvider>
                </SessionProvider>
              </AmplifyProvider>
            </Authenticator.Provider>
          </QueryClientProvider>
        </WithMathJax>
      </AnalyticsProvider>
    </Theme>
  );
} 
