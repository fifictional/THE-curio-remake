import { useSignOut } from '../api';
import { AccountDangerZone } from './account-danger';
import type { ProfileRow, SessionUser } from '../types';
import { AuthCard } from './auth-card';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-6 border-b border-black/5 py-3 last:border-0">
      <span className="text-sm text-headers">{label}</span>
      <span className="text-right text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}

export function Settings({
  user,
  profile,
}: {
  user: SessionUser | null;
  profile: ProfileRow | null;
}) {
  const signOut = useSignOut();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  const createdAt = profile?.createdAt ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <h1 className="font-roca text-2xl text-foreground">Settings</h1>
      <p className="mt-1 text-sm text-headers">Your account and how Curio knows you.</p>

      <section className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
          Account
        </h2>
        <Field label="Name" value={profile?.name ?? user.name} />
        <Field label="Email" value={user.email} />
        <Field
          label="Member since"
          value={createdAt ? new Date(createdAt).toLocaleDateString() : null}
        />
        <Field label="Country" value={profile?.country} />
        <Field label="About you" value={profile?.userDescription} />
      </section>

      <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
          Session
        </h2>
        <p className="text-sm text-headers">
          Signing out clears the session cookie; the documents and chats stay.
        </p>
        <button
          onClick={() =>
            signOut.mutate(undefined, { onSuccess: () => window.location.assign('/') })
          }
          disabled={signOut.isPending}
          className="mt-3 rounded-xl border border-chat-panel-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </button>
        {signOut.error && (
          <p className="mt-2 text-sm text-red-600">{(signOut.error as Error).message}</p>
        )}
      </section>

      <AccountDangerZone email={user.email} />
    </div>
  );
}
