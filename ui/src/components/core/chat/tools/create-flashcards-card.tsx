import { MessageToolExtra } from "@/lib/types";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChatContext, useCoreContext, useSessionContext, useSpaceContext } from "@/providers";
import useChatAddFlashcardApi from "@/hooks/api/flashcards/use-chat-add-flashcard.api";

interface FlashcardItem { title: string; content: string; }
interface CreateFlashcardsArgs { 
  messageUuid: string;
  flashcards: { flashcards: FlashcardItem[] };
  toolExtras?: MessageToolExtra; 
}

export function CreateFlashcardsCard({ messageUuid, flashcards, toolExtras }: CreateFlashcardsArgs) {
  const isLoading = !!toolExtras?.isLoading;
  const isSuccess = !!toolExtras?.success;
  const hasErrors = !!(toolExtras?.errors && toolExtras.errors.length > 0);
  const items = useMemo(() => flashcards?.flashcards || [], [flashcards]);
  const [selected, setSelected] = useState<number[]>(() => items.map((_, i) => i));
  const [isAdding, setIsAdding] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);

  const { chatUuid } = useChatContext();
  const { spaceUuid } = useSpaceContext();
  const { documentUuid } = useCoreContext();
  const { userAttributes } = useSessionContext();

  const { addFlashcard } = useChatAddFlashcardApi();

  useEffect(() => {
    // Reset selection when new flashcards arrive: select all by default
    setSelected(items.map((_, i) => i));
    setPage(0);
  }, [items]);

  function toggle(index: number, checked: boolean) {
    setSelected((prev) => checked ? Array.from(new Set([...prev, index])) : prev.filter((i) => i !== index));
  }

  const handleAddToLibrary = useCallback(async () => {
    setIsAdding(true);
    await addFlashcard({
      messageUuid: messageUuid,
      userUuid: userAttributes!.userUuid,
      spaceUuid: spaceUuid || null,
      documentUuid: documentUuid || null,
      chatUuid: chatUuid || null,
      flashcards: items.filter((_, idx) => selected.includes(idx)).map((fc) => ({
        title: fc.title,
        content: fc.content,
      })),
    });
    setIsAdding(false);
  }, [items, selected, addFlashcard, messageUuid]);

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full" data-testid="create-flashcards-card">
      <div className="rounded-lg border bg-focus text-card-foreground shadow p-4 w-full max-w-xl">
        <div className="text-lg font-semibold mb-2">Flashcards generated</div>
        {hasErrors && (
          <div className="text-sm text-red-600 mb-2">{toolExtras?.errors?.[0]}</div>
        )}
        <div className="flex flex-col divide-y rounded-md border bg-white" data-testid="flashcards-list">
          {items.slice(page * pageSize, page * pageSize + pageSize).map((fc: FlashcardItem, localIdx: number) => {
            const idx = page * pageSize + localIdx;
            return (
            <label key={idx} className="flex items-start gap-3 p-2" data-testid={`flashcard-item-${idx}`}>
              {!isSuccess && !hasErrors ? <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(idx)}
                onChange={(e) => toggle(idx, e.target.checked)}
                data-testid={`flashcard-checkbox-${idx}`}
              /> : <div className="w-2 h-2" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" title={fc.title} data-testid={`flashcard-title-${idx}`}>{fc.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2" data-testid={`flashcard-content-${idx}`}>{fc.content}</div>
              </div>
            </label>
          );})}
          {items.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">No flashcards found.</div>
          )}
        </div>
        {items.length > pageSize && (
          <div className="mt-3 flex items-center justify-between" data-testid="flashcard-message-pagination">
            <div className="flex items-center justify-center gap-2 w-full">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))} aria-label="Previous page" data-testid="flashcard-message-pagination-previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground" data-testid="flashcard-message-pagination-info">Page {page + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} aria-label="Next page" data-testid="flashcard-message-pagination-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-end mt-3">
          <div className="flex-1 flex items-center justify-end gap-3">
            {isSuccess || hasErrors && <div className="text-xs text-muted-foreground">Selected {selected.length} / {items.length}</div>}
            {isSuccess && !hasErrors ? (
              <motion.div initial={{ scale: 0.8, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.7 }} data-testid="flashcards-added-success">
                <Check className="h-5 w-5 text-emerald-600" aria-label="Created" />
              </motion.div>
            ) : (
              <Button
                size="sm"
                disabled={isLoading || selected.length === 0 || isAdding}
                onClick={handleAddToLibrary}
                data-testid="add-flashcards-to-library-button"
              >
                {isAdding || isLoading ? 'Adding…' : 'Add to library'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}