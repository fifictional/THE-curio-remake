'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AmplifyProvider, AnalyticsProvider, ChatProvider, CommonProvider, CoreProvider, SessionProvider, SpaceProvider } from '@/providers';
import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { MathJaxContext } from 'better-react-mathjax';
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

const MATHJAX_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MATHJAX === '1';

/**
 * The remake runs offline: MathJax loads from a CDN and, when it cannot, every
 * message logs "Typesetting failed". Disable the context locally (set
 * NEXT_PUBLIC_DISABLE_MATHJAX=1); set it to 0 to restore real typesetting.
 */
function WithMathJax({ children }: { children: React.ReactNode }) {
  if (MATHJAX_DISABLED) return <>{children}</>;
  return <MathJaxContext config={MathJaxConfig}>{children}</MathJaxContext>;
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
