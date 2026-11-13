import { getAreaBase64, Rectangle, useCanvasDraw } from "@/hooks/use-canvas-draw";
import { StudentDocumentVisionOutput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCoreContext } from "@/providers/core-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "react-pdf";
import { emitter } from "@/hooks/use-events";
import { v4 as uuidv4 } from 'uuid';
import { useAnalytics, useContextMenu } from "@/providers";
import { BoundingBox } from "./BoundingBox";

export type PageWrapperProps = {
  pageNumber: number;
  scale: number;
  currentTool: 'pointer' | 'text' | 'image';
  isSearching?: boolean;
};

const getContextMenuPosition = (lastRect: Rectangle, scale: number, contextMenuBoundingRect: DOMRect, parentBoundingRect: DOMRect & { scrollTop: number }, canvasBoundingRect: DOMRect) => {
  const contextMenuWidth = contextMenuBoundingRect.width;
  const contextMenuHeight = contextMenuBoundingRect.height;

  const xDiff = canvasBoundingRect.left - parentBoundingRect.left;
  const yDiff = canvasBoundingRect.top - parentBoundingRect.top;

  const scaledLastRect = {
    x: (lastRect.x * scale) + xDiff,
    y: (lastRect.y * scale) + yDiff,
    width: lastRect.width * scale,
    height: lastRect.height * scale,
  };

  // handle inverse selection
  let startX = scaledLastRect.x;
  let endX = scaledLastRect.x + scaledLastRect.width;
  let startY = scaledLastRect.y + parentBoundingRect.scrollTop;
  let endY = scaledLastRect.y + scaledLastRect.height + parentBoundingRect.scrollTop;

  if (scaledLastRect.width < 0) {
    startX = startX + scaledLastRect.width;
    endX = startX - scaledLastRect.width;
  }

  if (scaledLastRect.height < 0) {
    startY = startY + scaledLastRect.height;
    endY = startY - scaledLastRect.height;
  }

  let menuYPosition = 0;
  if (parentBoundingRect.height - (endY - parentBoundingRect.top) > 100) {
    menuYPosition = endY + 20;
  } else {
    menuYPosition = startY - 20 - contextMenuHeight;
  }

  const menuXPosition = ((startX + endX) / 2) - (contextMenuWidth / 2);

  return {
    x: menuXPosition,
    y: menuYPosition,
  };
}

export const PageWrapper = ({
  pageNumber,
  scale,
  currentTool,
  isSearching,
}: PageWrapperProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { documentVisionOutputs } = useCoreContext();
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const pageKeyRef = useRef<string>(uuidv4());
  const { openContextMenu, closeContextMenu, getParentBoundingClientRect, getContextMenuBoundingClientRect } = useContextMenu();
  const { track } = useAnalytics();

  const { 
    handlers,
    lastRect,
    setLastRect,
    drawRectangles,
  } = useCanvasDraw({ 
    scale,
    isDrawingMode: currentTool === 'image',
    onAreaSelected: (rect) => {
      if (!rect) {
        emitter.emit('core:selection-change', pageKeyRef.current);
        closeContextMenu();
      }
    }
  });

  useEffect(() => {
    const buildBoundingBoxes = async (documentVisionOutputs: StudentDocumentVisionOutput[]) => {
      // wait for canvas to be pouplated
      await new Promise(resolve => setInterval(() => {
        if (canvasRef.current) {
          resolve(true);
        }
      }, 100));

      const localBoundingBoxes = [];
      for (const visionOutput of documentVisionOutputs || []) {
        for (const section of visionOutput.sectionContent) {
          if (section.page_number !== pageNumber.toString()) continue;
          if (!section.bbox) continue;

          localBoundingBoxes.push({
            x: section.bbox[0] as number,
            y: section.bbox[1] as number,
            width: (section.bbox[2] as number) - (section.bbox[0] as number),
            height: (section.bbox[3] as number) - (section.bbox[1] as number),
            text: section.content_text,
          });
        }
      }
      setBoundingBoxes(localBoundingBoxes);
    }

    buildBoundingBoxes(documentVisionOutputs || []);
  }, [documentVisionOutputs, scale]);

  useEffect(() => {
    if (lastRect) {
      emitter.emit('core:selection-change', pageKeyRef.current);
      const base64 = getAreaBase64(lastRect, canvasRef.current, scale);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const contextMenuBoundingRect = getContextMenuBoundingClientRect();
      const parentBoundingRect = getParentBoundingClientRect();
      const canvasBoundingRect = canvas.getBoundingClientRect();

      const position = getContextMenuPosition(lastRect, scale, contextMenuBoundingRect, parentBoundingRect, canvasBoundingRect);

      openContextMenu({ text: '', imageBase64: base64 || '', position });
    }
  }, [lastRect, scale, openContextMenu, getContextMenuBoundingClientRect, getParentBoundingClientRect]);

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Match overlay size to PDF canvas
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    // fix the overlay size to the canvas size
    overlay.style.width = `round(down, var(--scale-factor) * ${canvas.clientWidth}px, var(--scale-round-x, 1px));`;
    overlay.style.height = `round(down, var(--scale-factor) * ${canvas.clientHeight}px, var(--scale-round-y, 1px));`;
    overlay.width = canvas.clientWidth;
    overlay.height = canvas.clientHeight;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Clear and draw all rectangles
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    drawRectangles(ctx);
  }, [scale, drawRectangles]);

  useEffect(() => {
    setLastRect(null);
  }, [currentTool]);

  useEffect(() => {
    const onSelectionChange = (data: string) => {
      if (data !== pageKeyRef.current) {
        setLastRect(null);
      }
    };
    emitter.on('core:selection-change', onSelectionChange);

    return () => {
      emitter.off('core:selection-change', onSelectionChange);
    };
  }, []);

  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  const handleBoundingBoxSelect = useCallback((bbox: BoundingBox) => {
    // convert bbox to canvas coordinates
    const canvas = canvasRef.current;
    if (!canvas) return;

    track('core:bounding-box-select');

    const canvasBbox = {
      x: bbox.x * canvas.width / (window.devicePixelRatio || 1) / scale,
      y: bbox.y * canvas.height / (window.devicePixelRatio || 1) / scale,
      width: bbox.width * canvas.width / (window.devicePixelRatio || 1) / scale,
      height: bbox.height * canvas.height / (window.devicePixelRatio || 1) / scale,
    };

    setLastRect(canvasBbox);
  }, [scale]);

  const onPageLoadSuccess = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!overlayCanvasRef.current) {
      const overlay = document.createElement('canvas');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.pointerEvents = 'none';
      overlay.width = canvas.clientWidth;
      overlay.height = canvas.clientHeight;
      overlay.style.width = `round(down, var(--scale-factor) * ${canvas.clientWidth}px, var(--scale-round-x, 1px));`;
      overlay.style.height = `round(down, var(--scale-factor) * ${canvas.clientHeight}px, var(--scale-round-y, 1px));`;

      canvas.parentElement?.appendChild(overlay);
      overlayCanvasRef.current = overlay;
    }
    
    renderOverlay();
  }, [renderOverlay]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) {
      closeContextMenu();
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText) {
      closeContextMenu();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const position = getContextMenuPosition(rect, 1, getContextMenuBoundingClientRect(), getParentBoundingClientRect(), { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0, toJSON: () => '' });

    openContextMenu({ text: selectedText, imageBase64: '', position });
  }, [openContextMenu, closeContextMenu, getContextMenuBoundingClientRect, getParentBoundingClientRect]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.type === 'contextmenu') {
      e.preventDefault();
    }
    
    if (currentTool === 'text') {
      handleTextSelection();
    }

    if (currentTool === 'pointer') {
      closeContextMenu();
      emitter.emit('core:selection-change', pageKeyRef.current);
      setLastRect(null);
    }

    handlers.onMouseUp(e);
  }, [currentTool, handlers.onMouseUp, handleTextSelection, closeContextMenu]);

  const onTouchEnd = useCallback(() => {
    if (currentTool === 'text') {
      handleTextSelection();
    }

    if (currentTool === 'pointer') {
      closeContextMenu();
      emitter.emit('core:selection-change', pageKeyRef.current);
      setLastRect(null);
    }
  }, [currentTool, handleTextSelection, closeContextMenu]);

  return (
    <div className="relative">
      <Page
        pageNumber={pageNumber}
        scale={scale}
        onRenderSuccess={onPageLoadSuccess}
        renderTextLayer={currentTool === 'text' || isSearching}
        canvasRef={canvasRef}
        devicePixelRatio={window.devicePixelRatio || 1}
        className={cn(
          "shadow-lg rounded-lg relative",
          currentTool === 'text' && "cursor-default",
          currentTool === 'image' && "cursor-crosshair"
        )}
        onMouseDown={(e) => canvasRef.current && handlers.onMouseDown(e, canvasRef.current)}
        onMouseMove={(e) => canvasRef.current && handlers.onMouseMove(e, canvasRef.current)}
        onMouseUp={onMouseUp}
        onMouseLeave={handlers.onMouseLeave}
        onContextMenu={onMouseUp}
        onTouchEnd={onTouchEnd}
      />
      <div className={cn("absolute top-0 left-0 w-full h-full z-1000",
        currentTool !== 'pointer' && "pointer-events-none")}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        >
        {currentTool === 'pointer' && boundingBoxes.map((bbox, index) => (
          <BoundingBox
            key={`${bbox.x}-${bbox.y}-${bbox.width}-${bbox.height}-${index}`}
            bbox={bbox}
            canvasWidth={(canvasRef.current?.width || 0) / (window.devicePixelRatio || 1)}
            canvasHeight={(canvasRef.current?.height || 0) / (window.devicePixelRatio || 1)}
            onSelect={handleBoundingBoxSelect}
          />
        ))}
      </div>
    </div>
  );  
};