import type { MetadataRow, SessionUser } from '../types';
import { AuthCard } from './auth-card';
import { Shell } from './shell';

/**
 * The metadata rows attached to one entity (document, chat, user…).
 *
 * Legacy screen, kept because it is the only view of those key/value rows, and
 * they carry things like document type and analytics timings.
 */
export function Metadata({
  user,
  targetUuid,
  metadata,
}: {
  user: SessionUser | null;
  targetUuid: string;
  metadata: MetadataRow[];
}) {
  if (!user) {
    return (
      <Shell user={null}>
        <AuthCard />
      </Shell>
    );
  }

  return (
    <Shell user={user} wide>
      <h1 className="font-roca text-2xl text-foreground">Metadata</h1>
      <p className="mt-1 text-xs text-headers">
        Target <code className="font-mono">{targetUuid}</code>
      </p>

      {metadata.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-chat-panel-border p-6 text-center text-sm text-headers">
          No metadata for this target, or it belongs to another account.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-chat-panel-border bg-chat-panel">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-headers">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {metadata.map((row) => (
                <tr key={row.metadataUuid} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">{row.name ?? '—'}</td>
                  <td className="px-4 py-2 text-headers">{row.targetType ?? '—'}</td>
                  <td className="max-w-[28rem] px-4 py-2 break-words text-paragraphs">
                    {row.value || '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-headers">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
