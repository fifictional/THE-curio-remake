import { DocumentContextMenu } from "@/components/ui/context-menu";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { emitter } from "@/hooks/use-events";
import { useAnalytics } from "./analytics-provider";
import { useSessionContext } from "./session-provider";
import { useCommonContext } from "./common-provider";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  selectedText: string | null;
  imageSelectionBase64: string | null;
}

interface OpenContextMenuProps {
  text: string;
  imageBase64: string;
  position: { x: number, y: number };
}

export const ContextMenuContext = createContext<{
  contextMenu: ContextMenuState;
  openContextMenu: (openProps: OpenContextMenuProps) => void;
  closeContextMenu: () => void;
  getParentBoundingClientRect: () => DOMRect & { scrollTop: number };
  getContextMenuBoundingClientRect: () => DOMRect;
}>({
  contextMenu: { open: false, x: 0, y: 0, selectedText: null, imageSelectionBase64: null },
  openContextMenu: (openProps: OpenContextMenuProps) => {},
  closeContextMenu: () => {},
  getParentBoundingClientRect: () => { const rect = new DOMRect(); return { ...rect, scrollTop: 0 } as DOMRect & { scrollTop: number } },
  getContextMenuBoundingClientRect: () => new DOMRect(),
});

export const useContextMenu = () => {
  return useContext(ContextMenuContext);
};

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ open: false, x: 0, y: 0, selectedText: null, imageSelectionBase64: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { track } = useAnalytics();
  const { hasReachedDailyLimit } = useSessionContext();
  const { setIsRateLimitModalOpen } = useCommonContext();

  const handleExplain = useCallback(() => {
    track('pdf-viewer-explain-clicked');
    if (hasReachedDailyLimit) {
      setIsRateLimitModalOpen(true);
      return;
    }
    emitter.emit('core:explain', JSON.stringify({text: contextMenu.selectedText || '', image: contextMenu.imageSelectionBase64 || ''}));
  }, [contextMenu.selectedText, contextMenu.imageSelectionBase64, hasReachedDailyLimit]);

  const handleCreateFlashcard = useCallback(() => {
    track('pdf-viewer-create-flashcard-clicked');
    if (hasReachedDailyLimit) {
      setIsRateLimitModalOpen(true);
      return;
    }
    emitter.emit('core:create-flashcard', JSON.stringify({text: contextMenu.selectedText || '', image: contextMenu.imageSelectionBase64 || ''}));
  }, [contextMenu.selectedText, contextMenu.imageSelectionBase64, hasReachedDailyLimit]);

  // position is in the page coordinates
  const openContextMenu = useCallback(({ text, imageBase64, position }: { text: string, imageBase64: string, position: { x: number, y: number } }) => {
    setContextMenu({ 
      open: true,
      x: position.x,
      y: position.y,
      selectedText: text,
      imageSelectionBase64: imageBase64,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0, selectedText: null, imageSelectionBase64: null });
  }, []);

  const getParentBoundingClientRect = useCallback(() => {
    // add scrollTop to the bounding client rect
    const parentRect = contextMenuRef.current?.parentElement?.getBoundingClientRect() || new DOMRect();
    const rect = {
      x: parentRect.x,
      y: parentRect.y,
      left: parentRect.left,
      top: parentRect.top,
      width: parentRect.width,
      height: parentRect.height,
      scrollTop: contextMenuRef.current?.parentElement?.scrollTop || 0,
    };
    return rect as unknown as DOMRect & { scrollTop: number };
  }, []);

  const getContextMenuBoundingClientRect = useCallback(() => {
    return contextMenuRef.current?.getBoundingClientRect() || new DOMRect();
  }, []);

  return (
    <ContextMenuContext.Provider value={{ contextMenu, openContextMenu, closeContextMenu, getParentBoundingClientRect, getContextMenuBoundingClientRect }}>
      <>
        {children}
        <DocumentContextMenu 
          ref={contextMenuRef}
          {...contextMenu}
          onExplain={handleExplain}
          onCreateFlashcard={handleCreateFlashcard}
        />
      </>
    </ContextMenuContext.Provider>
  );
}