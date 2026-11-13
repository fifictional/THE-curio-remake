'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { CurioMarkdown } from '../core/curio-markdown';
import { ActionMenu } from './action-menu';
import { Button } from './button';
import { InvisibleTextarea } from './invisible-textarea';
import { useSessionContext } from '@/providers';
import { useSendActivityLogs } from '@/hooks/useSendActivityLogs';
import { useSpaceContextSafe } from '@/providers/space-provider';

interface FlashcardProps {
  flashcardUuid: string;
  title: string;
  content: string;
  onDelete: ({ flashcardUuid }: { flashcardUuid: string }) => Promise<boolean>;
  onRename: ({ flashcardUuid, title, content }: { flashcardUuid: string, title: string, content: string }) => Promise<boolean>;
}

export function Flashcard({ flashcardUuid, title, content, onDelete, onRename }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sideAInputRef = useRef<HTMLTextAreaElement>(null);
  const sideBInputRef = useRef<HTMLTextAreaElement>(null);

  const [isBusy, setIsBusy] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const { userAttributes } = useSessionContext();
  const { sendActivity } = useSendActivityLogs();
  const spaceContext = useSpaceContextSafe();
  
  // `SpaceProvider` is mounted globally, so `spaceContext` is always truthy.
  // Key on `spaceContext.spaceUuid` (same idiom as `file-browser.tsx`) to detect
  // whether we're actually inside a space route before gating on write access.
  const canEdit = spaceContext?.spaceUuid ? spaceContext.canWrite : true;

  useEffect(() => {
    const element = containerRef.current;
    const parent = parentRef.current?.parentElement; // observe the area that grows with the panel
    if (!element) return;

    const baseWidth = 384; // px, previous max card width
    const updateScale = (width: number) => {
      const rawScale = width / baseWidth;
      const clampedScale = Math.max(0.75, rawScale);
      element.style.setProperty('--card-scale', String(clampedScale));
    };

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        updateScale(width);
      }
    });

    // Prefer observing the container's parent area so scale follows panel width
    if (parent) {
      observer.observe(parent);
      updateScale(parent.getBoundingClientRect().width);
    } else {
      observer.observe(element);
      updateScale(element.getBoundingClientRect().width);
    }
    return () => observer.disconnect();
  }, []);

  const onFlip = useCallback(() => {
    if (isRenaming) return;

    setIsFlipped(!isFlipped);
    setIsRenaming(false);
    sendActivity({
      email: userAttributes?.email ?? '',
      lastActivityDate: new Date().toISOString(),
      traits: {
        lastActivityDate: new Date().toISOString(),
      }
    })
  }, [isFlipped, isRenaming, sendActivity]);

  const item = useMemo(() => ({ flashcardUuid, title, content }), [flashcardUuid, title, content]);

  const onStartRename = useCallback(() => {
    setIsRenaming(true);
    setEditTitle(title);
    setEditContent(content);

    if (isFlipped) {
      sideBInputRef.current?.focus();
    } else {
      sideAInputRef.current?.focus();
    }
  }, [isFlipped, title, content]);

  const onRenameInternal = useCallback(async () => {
    console.log('rename internal');
    if (!isRenaming) {
      return;
    }

    setRenameError(null);

    setIsBusy(true);
    const success = await onRename({ flashcardUuid, title: editTitle, content: editContent });
    if (success) {
      setIsRenaming(false);
    } else {
      setRenameError('An error occurred while renaming the flashcard, please try again later or contact support if the problem persists.');
    }
    setIsBusy(false);
  }, [onRename, isRenaming, editTitle, editContent])

  const onDeleteInternal = useCallback(async () => {
    setIsBusy(true);
    const success = await onDelete({
      flashcardUuid
    })

    if (!success) {
      setDeleteError('An error occurred while deleting the flashcard, please try again later or contact support if the problem persists.');
    }

    setIsBusy(false);
  }, [onDelete]);

  const onKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!isRenaming) {
      return;
    }

    setRenameError(null);

    if (e.key === 'Enter') {
      await onRenameInternal();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  }, [onRename, onRenameInternal, isRenaming]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative w-full max-w-full aspect-[3/2] mx-auto cursor-pointer [perspective:1000px] group [container-type:inline-size]"
      ref={containerRef}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Front */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-between p-6 rounded-lg border border-gray-200 bg-white [backface-visibility:hidden]">
          {/* Inside border */}
          <div className="absolute inset-3 rounded-lg border border-primary" />

          {/* Top decoration */}
          <div className="w-16 h-1 bg-gray-200 rounded-full" />

          {/* 3 dots menu */}
          <div className="absolute top-4 right-4 z-100">
            {!isRenaming && <ActionMenu actions={['delete', 'rename']} item={item} canDelete={canEdit} canMove={false} canRename={canEdit} renameText="Edit Side A" onDelete={onDeleteInternal} onRename={onStartRename} />}
            {isRenaming && <X onClick={() => setIsRenaming(false)} className='h-5 w-5 disabled:text-gray-400' />}
          </div>

          {/* Content */}
          <div className="relative w-full max-h-full flex flex-wrap items-center justify-center overflow-y-auto">
            {isRenaming && (<>
              <InvisibleTextarea
                ref={sideAInputRef}
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditTitle(e.target.value)}
                onBlur={() => onRename({ flashcardUuid, title: editTitle, content: editContent })}
                onKeyDown={onKeyDown}
                className="text-3xl h-auto font-semibold text-headers max-w-full w-full"
                wrapperClassName="w-full max-w-full"
                autoFocus
                disabled={isBusy}
              />
              {isBusy && (
                // show a loder during the save
                <Loader2 className="h-5 w-5 animate-spin absolute right-0 top-1" />
              )}
              {renameError && (
                <p className="text-red-500 text-sm">{renameError}</p>
              )}
            </>)}
            {!isRenaming && (
              <h3 className="text-[calc(1.25rem*var(--card-scale,1))] font-bold text-center text-gray-900 hyphens-auto">
                <CurioMarkdown content={title} />
                {deleteError && <p>
                  {deleteError}
                </p>}
                {isBusy && (
                  // show a loder during the save
                  <Loader2 className="h-5 w-5" />
                )}
              </h3>
            )}
          </div>

          {/* Flip indicator */}
          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
            {isRenaming && (
              <Button disabled={isBusy} onClick={onRenameInternal} size="sm" className="text-gray-200 bg-gray-700 hover:bg-gray-400 transition-colors disabled:bg-gray-400 z-100">
                Save
              </Button>
            )}
            {!isRenaming && (<>
              <ArrowLeftRight className="w-4 h-4 animate-bounce" />
              <span className="text-xs">Tap to flip</span>
            </>)}
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-between p-6 rounded-lg text-lg border border-gray-200 bg-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {/* Inside border */}
          <div className="absolute inset-3 rounded-lg border border-primary" />

          {/* Top decoration */}
          <div className="w-16 h-1 bg-gray-200 rounded-full" />

          {/* 3 dots menu */}
          <div className="absolute top-4 right-4 z-100">
            {!isRenaming && <ActionMenu actions={['delete', 'rename']} item={item} canDelete={canEdit} canMove={false} canRename={canEdit} renameText="Edit Side B" onDelete={onDeleteInternal} onRename={onStartRename} />}
            {isRenaming && <X onClick={() => setIsRenaming(false)} className='h-5 w-5 disabled:text-gray-400' />}
          </div>

          {/* Content */}
          <div className="relative w-full max-h-full flex flex-wrap items-center justify-center overflow-y-auto">
            {isRenaming && (<>
              <InvisibleTextarea
                ref={sideBInputRef}
                value={editContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                onBlur={() => onRename({ flashcardUuid, title: editTitle, content: editContent })}
                onKeyDown={onKeyDown}
                className="text-3xl h-auto font-semibold text-headers max-w-full w-full"
                wrapperClassName="w-full max-w-full"
                autoFocus
                disabled={isBusy}
              />
              {isBusy && (
                // show a loder during the save
                <Loader2 className="h-5 w-5 animate-spin absolute right-0 top-1" />
              )}
              {renameError && (
                <p className="text-red-500 text-sm">{renameError}</p>
              )}
            </>)}
            {!isRenaming && (<>
              <p className="text-gray-700 italic text-center text-[calc(1rem*var(--card-scale,1))]">
                <CurioMarkdown content={content} />
              </p>
              {deleteError && <p>
                {deleteError}
              </p>}
              {isBusy && (
                // show a loder during the save
                <Loader2 className="h-5 w-5" />
              )}
            </>)}
          </div>

          {/* Flip indicator */}
          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors">
            {isRenaming && (
              <Button disabled={isBusy} onClick={onRenameInternal} size="sm" className="text-gray-200 bg-gray-700 hover:bg-gray-400 transition-colors disabled:bg-gray-400 z-100">
                Save
              </Button>
            )}
            {!isRenaming && (<>
              <ArrowLeftRight className="w-4 h-4 animate-bounce" />
              <span className="text-xs">Tap to flip</span>
            </>)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 