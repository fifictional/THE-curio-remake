import * as React from "react"
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { useCoreContext } from "@/providers";

interface DocumentContextMenuProps {
  x: number;
  y: number;
  open: boolean;
  selectedText: string | null;
  imageSelectionBase64: string | null;
  onExplain: () => void;
  onCreateFlashcard: () => void;
}

export const DocumentContextMenu = forwardRef<HTMLDivElement, DocumentContextMenuProps>(({
  x,
  y,
  open,
  selectedText,
  imageSelectionBase64,
  onExplain,
  onCreateFlashcard,
}, ref) => {
  const { waitingForResponse } = useCoreContext();
  const selectedTextLength = selectedText?.length || 0;

  return (
    <div 
      ref={ref}
      className={cn(
        "flex flex-row items-center p-2 divide-gray-200 h-10",
        "divide-x-2 bg-white rounded-md shadow-md z-1000 border border-gray-200",
      )}
      style={{
        zIndex: 1000,
        position: 'absolute',
        left: !open ? -1000 : x,
        top: !open ? -1000 : y,
      }}
    >
      <button 
        className="text-sm p-2 text-gray-900 leading-none select-none outline-none cursor-pointer hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onExplain}
        disabled={!selectedText && !imageSelectionBase64 || (waitingForResponse || selectedTextLength > Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH))}
        title={selectedTextLength > Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH) ? 'Selected text is too long' : ''}
      >
        Explain
      </button>
      {/* <button 
        className="text-sm p-2 text-gray-900 leading-none select-none outline-none cursor-pointer hover:gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onCreateFlashcard}
        disabled={!selectedText && !imageSelectionBase64 || (waitingForResponse || selectedTextLength > Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH))}
        title={selectedTextLength > Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH) ? 'Selected text is too long' : ''}
      >
        Flashcard
      </button> */}
    </div>
  )
});