import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { ProfileRow, SessionUser, SubscriptionRow } from '../types';
import { AccountDangerZone } from './account-danger';
import { AuthCard } from './auth-card';

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-6 border-b border-black/5 py-3 last:border-0">
      <span className="text-sm text-headers">{label}</span>
      <span className={`text-right text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`}>
        {value || 'Not set'}
      </span>
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-center gap-2">
      <span className="truncate font-mono text-xs text-headers" title={id}>
        {id}
      </span>
      <button
        onClick={async () => {
          await navigator.clipboard?.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-xs underline"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

export function Profile({
  user,
  profile,
  subscription,
}: {
  user: SessionUser | null;
  profile: ProfileRow | null;
  subscription: SubscriptionRow | null;
}) {
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-6 pt-16">
        <AuthCard />
      </div>
    );
  }

  const period = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <h1 className="font-roca text-2xl text-foreground">Profile</h1>

      <section className="mt-6 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-headers">
          Personal information
        </h2>
        <Row label="First name" value={profile?.firstName} />
        <Row label="Last name" value={profile?.lastName} />
        <Row label="Email" value={user.email} />
        <div className="flex items-center justify-between gap-6 border-b border-black/5 py-3">
          <span className="text-sm text-headers">User id</span>
          <CopyId id={user.sub} />
        </div>
        <Row label="Country" value={profile?.country} />
        <Row
          label="Member since"
          value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : null}
          mono
        />
      </section>

      <section className="mt-4 rounded-2xl border border-chat-panel-border bg-chat-panel p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-headers">
          Subscription
        </h2>
        {subscription ? (
          <div className="text-sm text-foreground">
            <p>
              {subscription.tier ?? 'Curio'} · {subscription.status ?? 'active'}
              {subscription.provider ? ` · via ${subscription.provider}` : ''}
            </p>
            {period && <p className="mt-1 text-xs text-headers">Renews {period}</p>}
          </div>
        ) : (
          <p className="text-sm text-headers">
            No active subscription. Checkout is not part of this build — see{' '}
            <Link to="/settings" className="underline">
              settings
            </Link>{' '}
            for account data.
          </p>
        )}
      </section>

      <AccountDangerZone email={user.email} />
    </div>
  );
}
