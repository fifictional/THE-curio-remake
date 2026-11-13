'use client';

import { StudentDocumentSummary } from "@/lib/types";
import { CurioMarkdown } from "./curio-markdown";
import { useState, useCallback, useEffect, useRef } from "react";
import { useAnalytics, useAmplifyApiClient } from "@/providers";
import { VoteToggle } from "@/components/ui/vote-toggle";
import { useReducedMotion } from "framer-motion";
import { useLoadingMessage } from "@/hooks/use-loading-message";
import { CurioLoadingWithSearch } from "../ui/curio-loading-search";

export const DocumentSummary = ({ documentSummary }: { documentSummary: StudentDocumentSummary }) => {
  const client = useAmplifyApiClient();
  const { track } = useAnalytics();
  const [localVote, setLocalVote] = useState<StudentDocumentSummary['vote']>(documentSummary.vote ?? null);
  const [isUpdating, setIsUpdating] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { message } = useLoadingMessage();
  
  // Determine if we should show loading based on status
  const status = documentSummary.status;
  const showLoading = status === 'started';
  const showSummary = status === 'streaming' || status === 'completed' || status === 'error';
  const showVoteButtons = status === 'completed';

  // Smoothly reveal streaming summary updates (optimized for longer content)
  const [renderedSummary, setRenderedSummary] = useState(documentSummary.summary || '');
  const lastFullSummaryRef = useRef(documentSummary.summary || '');
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const prev = lastFullSummaryRef.current || '';
    const next = documentSummary.summary || '';

    if (next === prev) return; // nothing to animate

    // Skip animation for very long summaries to avoid lag (markdown rendering is expensive)
    const SUMMARY_LENGTH_THRESHOLD = 2000;
    if (prefersReducedMotion || next.length > SUMMARY_LENGTH_THRESHOLD) {
      lastFullSummaryRef.current = next;
      setRenderedSummary(next);
      return;
    }

    // Find common prefix; animate typing only the new suffix
    let i = 0;
    const minLen = Math.min(prev.length, next.length);
    while (i < minLen && prev.charCodeAt(i) === next.charCodeAt(i)) i++;
    const commonPrefix = next.slice(0, i);
    const newSuffix = next.slice(i);

    // Start from current rendered (fallback to prev if new mount)
    setRenderedSummary(commonPrefix);
    lastFullSummaryRef.current = next;

    // Cancel prior animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isAnimatingRef.current = true;

    const chars = Array.from(newSuffix);
    let idx = 0;
    // Use larger batch size for summaries (markdown rendering is expensive)
    const batch = 10;
    const step = () => {
      if (idx >= chars.length) {
        isAnimatingRef.current = false;
        setRenderedSummary(commonPrefix + newSuffix);
        return;
      }
      // Batch more characters per frame for summaries to reduce re-renders
      const end = Math.min(idx + batch, chars.length);
      const chunk = chars.slice(idx, end).join('');
      idx = end;
      setRenderedSummary(current => current + chunk);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [documentSummary.summary, prefersReducedMotion]);

  const handleVote = useCallback(async (direction: 'up' | 'down') => {
    if (isUpdating) return;
    setIsUpdating(true);
    const previousVote = localVote ?? null;
    const nextVote: 'up' | 'down' | null = previousVote === direction ? null : direction;

    // optimistic update
    setLocalVote(nextVote);
    try {
      await client.models.DocumentSummary.update({
        documentSummaryUuid: documentSummary.documentSummaryUuid,
        vote: nextVote as any,
      });

      const eventName = nextVote === null
        ? 'summary-vote-clear'
        : nextVote === 'up'
          ? 'summary-vote-up'
          : 'summary-vote-down';
      track(eventName, {
        documentSummaryUuid: documentSummary.documentSummaryUuid,
        documentUuid: documentSummary.documentUuid,
        previousVote,
        newVote: nextVote,
        source: 'right-panel-summary',
      });
    } catch (error) {
      // rollback
      setLocalVote(previousVote);
      track('summary-vote-error', {
        documentSummaryUuid: documentSummary.documentSummaryUuid,
        documentUuid: documentSummary.documentUuid,
        previousVote,
        attemptedVote: direction,
        source: 'right-panel-summary',
        error: (error as Error)?.message || String(error),
      });
    } finally {
      setIsUpdating(false);
    }
  }, [client.models.DocumentSummary, documentSummary.documentSummaryUuid, documentSummary.documentUuid, isUpdating, localVote, track]);

  // Show loading for started status or when loading
  if (showLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <CurioLoadingWithSearch message={message} />
      </div>
    );
  }

  // Show summary content when streaming or completed
  if (showSummary) {
    return (
      <div>
        {/* Main Summary */}
        <div>
          <div className="prose prose-gray max-w-none">
            <CurioMarkdown content={renderedSummary} />
          </div>
        </div>

        {/* Vote Controls - only show when completed */}
        {showVoteButtons && (
          <VoteToggle
            className="mt-3"
            value={localVote ?? null}
            disabled={isUpdating}
            variant="icon"
            align="right"
            onUpClick={() => handleVote('up')}
            onDownClick={() => handleVote('down')}
          />
        )}
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
};