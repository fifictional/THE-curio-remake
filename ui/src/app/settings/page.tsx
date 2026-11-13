'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, CheckCircle2, Trash2, Download, ChevronDown } from 'lucide-react';
import { useMemoryBlocksApi } from '@/hooks/api/memory/use-memory-blocks.api';
import { useMemoryToggleApi } from '@/hooks/api/memory/use-memory-toggle.api';
import { useMemoryClearApi } from '@/hooks/api/memory/use-memory-clear.api';
import { useMemoryExportApi } from '@/hooks/api/memory/use-memory-export.api';
import { useMemoryBackfillApi } from '@/hooks/api/memory/use-memory-backfill.api';
import { useMemoryBackfillBannerApi } from '@/hooks/api/memory/use-memory-backfill-banner.api';
import { useMemorySessionsApi } from '@/hooks/api/memory/use-memory-sessions.api';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { MemoryBlock } from '@/lib/types/memory-block';
import { dedupeMemoryBlocksForDisplay } from '@/lib/utils/dedupe-memory-blocks';
import { formatMemoryAddedFromLabel } from '@/lib/utils/memory-added-from-label';
import { formatTopicDisplayName } from '../../../amplify/ai/memory/topic-similarity';

const PAGE_SIZE = 2;

function MemoryTopicCard({
  block,
  variant,
  onDelete,
}: {
  block: MemoryBlock;
  variant: 'gap' | 'mastered';
  onDelete: (id: string) => void;
}) {
  const payload = block.payload as {
    description?: string;
    askedCount?: number;
    documentName?: string;
  };
  const when = formatDistanceToNow(
    new Date(block.lastReinforcedAt ?? block.firstSeenAt ?? block.createdAt),
    {
      addSuffix: true,
    },
  );
  const sourceLabel = block.subject || payload.documentName || 'Study sessions';
  const addedFromLabel = formatMemoryAddedFromLabel(block);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          {variant === 'gap' ? (
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {variant === 'gap' ? 'Knowledge gap' : 'Mastered'}
            </p>
            <p className="font-medium text-gray-900">{formatTopicDisplayName(block.topic)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(block.memoryBlockUuid)}
          className="text-gray-400 hover:text-red-600"
          aria-label="Delete memory"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {payload.description && (
        <p className="mt-2 text-sm text-gray-600">{payload.description}</p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        {when} · {sourceLabel}
        {addedFromLabel ? ` · ${addedFromLabel}` : ''}
        {variant === 'gap' && payload.askedCount
          ? ` · Asked ${payload.askedCount} time${payload.askedCount === 1 ? '' : 's'}`
          : ''}
      </p>
    </div>
  );
}

function MemorySection({
  title,
  count,
  blocks,
  variant,
  isLoading,
  onDelete,
}: {
  title: string;
  count: number;
  blocks: MemoryBlock[];
  variant: 'gap' | 'mastered';
  isLoading: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? blocks : blocks.slice(0, PAGE_SIZE);
  const hasMore = blocks.length > PAGE_SIZE;

  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold text-gray-900">
        {title} · {count} topic{count === 1 ? '' : 's'}
      </h3>
      {isLoading && (
        <p className="mt-3 text-sm text-gray-500">Loading…</p>
      )}
      {!isLoading && blocks.length === 0 && (
        <p className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No {variant === 'gap' ? 'knowledge gaps' : 'mastered topics'} yet. Keep studying with
          Curio and your profile will grow.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {visible.map((b) => (
          <MemoryTopicCard
            key={b.memoryBlockUuid}
            block={b}
            variant={variant}
            onDelete={onDelete}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {expanded ? 'Show less' : `Show ${blocks.length - PAGE_SIZE} more`}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { memoryEnabled, setEnabled, isSaving } = useMemoryToggleApi();
  const { clearAll, isClearing } = useMemoryClearApi();
  const { exportProfile, isExporting, error: exportError } = useMemoryExportApi();
  const { runBackfill, isRunning: isBackfilling } = useMemoryBackfillApi();
  const { refreshBanner } = useMemoryBackfillBannerApi();
  const { sessionCount } = useMemorySessionsApi();
  const gaps = useMemoryBlocksApi('knowledge_gap');
  const mastered = useMemoryBlocksApi('mastered_topic');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void (async () => {
      await runBackfill();
      gaps.refresh();
      mastered.refresh();
      refreshBanner();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { gaps: displayGaps, mastered: displayMastered } = useMemo(
    () => dedupeMemoryBlocksForDisplay(gaps.blocks, mastered.blocks),
    [gaps.blocks, mastered.blocks],
  );

  const topicsTracked = useMemo(
    () => displayGaps.length + displayMastered.length,
    [displayGaps.length, displayMastered.length],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Data & Memory</h1>
        <Link
          href="/profile"
          className="mt-1 shrink-0 text-sm text-gray-600 hover:text-gray-900"
        >
          Back to profile →
        </Link>
      </div>
      <p className="mt-1 text-gray-600">
        Customize how Curio learns with you and manages your study data.
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Enable Memory & Learning</p>
            <p className="text-sm text-gray-500">
              Let Curio remember your progress across sessions.
            </p>
          </div>
          <Switch
            checked={memoryEnabled}
            disabled={isSaving}
            onCheckedChange={setEnabled}
          />
        </div>
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">Manage your study data</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !memoryEnabled}
              onClick={() => void exportProfile()}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={isClearing}
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                void clearAll().then(() => {
                  gaps.refresh();
                  mastered.refresh();
                  setConfirmClear(false);
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {confirmClear ? 'Confirm clear all' : 'Clear all'}
            </Button>
          </div>
          {exportError && (
            <p className="mt-2 text-sm text-red-600">{exportError}</p>
          )}
          {isBackfilling && (
            <p className="mt-2 text-sm text-gray-500">Scanning quiz history…</p>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-gray-900">{topicsTracked}</p>
            <p className="text-sm text-gray-500">Topics tracked</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold text-gray-900">
              {sessionCount ?? '—'}
            </p>
            <p className="text-sm text-gray-500">Sessions</p>
          </div>
        </div>

        {!memoryEnabled && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Memory tracking is paused. Turn it on to build your profile and use memories in chat.
          </p>
        )}

        {(gaps.error || mastered.error) && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {gaps.error || mastered.error}
          </p>
        )}

        <MemorySection
          title="Knowledge Gaps"
          count={displayGaps.length}
          blocks={displayGaps}
          variant="gap"
          isLoading={gaps.isLoading}
          onDelete={(id) => void gaps.deleteBlock(id)}
        />
        <MemorySection
          title="Topics Mastered"
          count={displayMastered.length}
          blocks={displayMastered}
          variant="mastered"
          isLoading={mastered.isLoading}
          onDelete={(id) => void mastered.deleteBlock(id)}
        />
      </div>
    </div>
  );
}
