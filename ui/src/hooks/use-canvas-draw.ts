import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '@/providers/analytics-provider';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCanvasDrawOptions {
  scale?: number;
  onAreaSelected?: (rect: Rectangle | null) => void;
  isDrawingMode?: boolean;
}

export function useCanvasDraw({ scale = 1, onAreaSelected, isDrawingMode = false }: UseCanvasDrawOptions = {}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [lastRect, setLastRect] = useState<Rectangle | null>(null);
  const { track } = useAnalytics();

  useEffect(() => {
    if (!isDrawingMode) {
      clearSelection();
    }
  }, [isDrawingMode]);

  const getMousePos = useCallback((e: MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }, [scale]);

  const drawRectangles = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw last rectangle
    if (lastRect) {
      // draw a shadow for the last rectangle
      ctx.lineWidth = 2;
      // draw the last rectangle
      ctx.strokeStyle = '#067A55';
      ctx.strokeRect(
        lastRect.x * scale, 
        lastRect.y * scale, 
        lastRect.width * scale, 
        lastRect.height * scale
      );

      // draw 4 small rectangles at the corners of the last rectangle
      ctx.strokeStyle = '#eeeeee';
      ctx.strokeRect(
        lastRect.x * scale - 5,
        lastRect.y * scale - 5,
        10,
        10
      );
      ctx.strokeRect(
        lastRect.x * scale + lastRect.width * scale - 5,
        lastRect.y * scale - 5,
        10,
        10
      );
      ctx.strokeRect(
        lastRect.x * scale - 5,
        lastRect.y * scale + lastRect.height * scale - 5,
        10,
        10
      );
      ctx.strokeRect(
        lastRect.x * scale + lastRect.width * scale - 5,
        lastRect.y * scale + lastRect.height * scale - 5,
        10,
        10
      );
    }

    // Draw current rectangle if drawing
    if (currentRect) {
      ctx.strokeStyle = '#067A5566';
      ctx.fillStyle = '#067A5566';
      ctx.fillRect(
        currentRect.x * scale,
        currentRect.y * scale,
        currentRect.width * scale,
        currentRect.height * scale
      );
    }
  }, [scale, lastRect, currentRect]);

  const handleMouseDown = useCallback((e: React.MouseEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawingMode) return;

    e.preventDefault();
    if (e.button === 2) return; // Right click is handled by onContextMenu
    if (e.button !== 0) return;
    if (!isDrawingMode) return;

    const { x, y } = getMousePos(e.nativeEvent, canvas);
    setIsDrawing(true);
    track('core:drawing-start');
    
    setCurrentRect({
      x,
      y,
      width: 0,
      height: 0
    });
  }, [isDrawingMode, getMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawing || !currentRect) return;

    const { x, y } = getMousePos(e.nativeEvent, canvas);
    setCurrentRect(prev => {
      if (!prev) return null;
      return {
        ...prev,
        width: x - prev.x,
        height: y - prev.y
      };
    });
  }, [isDrawing, currentRect, getMousePos]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawingMode) return;

    e.preventDefault();
    if (!isDrawing || !currentRect) return;

    // calculate the area of the current rect
    const area = currentRect.width * currentRect.height;
    if (area >= 50) {
      setLastRect(currentRect);

      if (onAreaSelected) {
        onAreaSelected(currentRect);
      }
    } else {
      setLastRect(null);
      if (onAreaSelected) {
        onAreaSelected(null);
      }
    }

    setCurrentRect(null);
    setIsDrawing(false);
  }, [isDrawing, currentRect, onAreaSelected, isDrawingMode]);

  const clearSelection = useCallback(() => {
    setLastRect(null);
    setCurrentRect(null);
  }, []);

  return {
    isDrawingMode,
    currentRect,
    lastRect,
    setLastRect,
    clearSelection,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
    drawRectangles,
  };
} 

export const getAreaBase64 = (rect: Rectangle, canvasRef: HTMLCanvasElement | null, scale: number) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvasRef) return null;

    // Set canvas size to the selection size
    canvas.width = Math.abs(rect.width);
    canvas.height = Math.abs(rect.height);

    // Calculate the correct coordinates for negative width/height
    const x = rect.width < 0 ? rect.x + rect.width : rect.x;
    const y = rect.height < 0 ? rect.y + rect.height : rect.y;
    const width = Math.abs(rect.width);
    const height = Math.abs(rect.height);

    // Draw the selected portion of the image
    ctx.drawImage(
      canvasRef,
      x * scale * (window.devicePixelRatio || 1),
      y * scale * (window.devicePixelRatio || 1),
      width * scale * (window.devicePixelRatio || 1),
      height * scale * (window.devicePixelRatio || 1),
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL();
  } catch (error) {
    console.error('Error generating base64:', error);
    return null;
  }
}