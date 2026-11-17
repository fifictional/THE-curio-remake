import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';

/** Route-level error boundary: without it an SSR throw shows a bare "Something went wrong". */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-chat-panel-border bg-chat-panel p-6">
      <h1 className="font-roca text-xl text-foreground">Something broke</h1>
      <p className="mt-2 text-sm text-headers">
        {(error as Error)?.message || 'Unexpected error.'}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            reset();
            void router.invalidate();
          }}
          className="rounded-xl border border-chat-panel-border px-3 py-2 text-sm"
        >
          Try again
        </button>
        <Link to="/" search={{ chat: undefined }} className="rounded-xl px-3 py-2 text-sm underline">
          Back to chat
        </Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-chat-panel-border bg-chat-panel p-6">
      <h1 className="font-roca text-xl text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-headers">That link does not point anywhere in this build.</p>
      <Link to="/" search={{ chat: undefined }} className="mt-4 inline-block text-sm underline">
        Back to chat
      </Link>
    </div>
  );
}
