'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdminSearchUsersApi, type UserSummary } from '@/hooks/api/bundles';
import { cn } from '@/lib/utils';

export function UserSearch({ onSelect }: { onSelect: (user: UserSummary) => void }) {
  const [query, setQuery] = useState('');
  const { searchByEmail, users, isLoading } = useAdminSearchUsersApi();
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setError(null);
    try {
      await searchByEmail(query);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search by email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-sm rounded-lg"
        />
        <Button className="h-11 rounded-lg" onClick={handleSearch} disabled={!query.trim() || isLoading}>
          {isLoading ? 'Searching…' : 'Search'}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">Email</th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide">Name</th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide w-1 whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide w-1 whitespace-nowrap">UserId</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u: UserSummary) => (
              <tr
                key={u.userId}
                onClick={() => onSelect(u)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <td className="px-3 py-2 align-top">{u.email}</td>
                <td className="px-3 py-2 align-top">
                  {(u.givenName || u.familyName) ? `${u.givenName || ''} ${u.familyName || ''}`.trim() : '—'}
                </td>
                <td className="px-3 py-2 align-top w-1 whitespace-nowrap">
                  <span className={cn('text-xs font-semibold', u.enabled ? 'text-emerald-600' : 'text-red-600')}>
                    {u.status || (u.enabled ? 'Enabled' : 'Disabled')}
                  </span>
                </td>
                <td className="px-3 py-2 align-top text-xs font-mono w-1 whitespace-nowrap">{u.userId}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Searching…' : 'No results'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


