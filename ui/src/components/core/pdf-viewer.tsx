'use client';

import '@/lib/pdf/pdf-worker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document } from 'react-pdf';
import { ViewerToolbar } from './viewer-toolbar';

// Import required CSS for text layer
import 'react-pdf/dist/Page/TextLayer.css';
// Import required CSS for annotation layer
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { PageWrapper } from './PageWrapper';
import { useListenToZoom } from '@/hooks/use-listen-to-zoom';
import { ContextMenuProvider, useCommonContext, useContextMenu } from '@/providers';
import { useGesture } from '@use-gesture/react';
import { LoadingSpinnerWithType } from '@/components/ui/loading-spinner-with-type';

interface PDFViewerProps {
  url: string;
  type?: 'pdf' | 'image' | 'video';
}

function removeHighlights(parentRef: HTMLDivElement) {
  parentRef.querySelectorAll('span[data-highlight]').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;

    // Replace <mark> with its text content
    const textNode = document.createTextNode(el.textContent || '');
    parent.replaceChild(textNode, el);

    // Merge adjacent text nodes
    parent.normalize();
  });
  parentRef.querySelectorAll('.bounding-box.highlighted').forEach((el) => {
    el.classList.remove('highlighted');
    el.classList.remove('current-match');
  });
}

const isBoundingBox = (node: Node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = (node as HTMLElement).parentElement?.parentElement;
    return parent?.classList.contains('bounding-box');
  }
  return false;
}

function highlightAllOccurrences(keyword: string, selectedMatchIndex: number, parentRef: HTMLDivElement) {
  removeHighlights(parentRef); // Clear previous highlights
  let matches = 0;
  let highlightedMatches = 0;

  if (!keyword) return matches;

  const regex = new RegExp(`(${keyword})`, 'gi');

  const walk = (node: Node) => {
    // evalute not bounding box first
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || '';
      const match = text.match(regex);
      if (match) {
        if (!isBoundingBox(node)) {
          highlightedMatches++;
          const span = document.createElement('span');
          span.setAttribute('data-highlight', 'true');
          span.innerHTML = text.replace(regex, '<mark style="color: transparent;background-color: rgba(255, 255, 0, 0.5);">$1</mark>');
          if (highlightedMatches === selectedMatchIndex + 1) {
            // highlight the match
            // scroll to the match
            span.innerHTML = text.replace(regex, '<mark id="highlighted-text" style="color: transparent;background-color: rgba(255, 0, 0, 0.5);">$1</mark>');
          }
          node.parentNode?.replaceChild(span, node);
        } else {
          matches++;
          (node as HTMLElement).parentElement?.parentElement?.classList.add('highlighted');
          if (matches === selectedMatchIndex + 1) {
            // highlight the match
            (node as HTMLElement).parentElement?.parentElement?.classList.add('current-match');
          }
        }
      }
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !(node as HTMLElement).closest('mark')
    ) {
      // Avoid reprocessing already highlighted text
      node.childNodes.forEach(walk);
    }
  };

  walk(parentRef);

  const highlightedText = document.getElementById('highlighted-text');
  if (highlightedText) {
    const elementBoundingRect = highlightedText.getBoundingClientRect();
    console.log(elementBoundingRect.top)
    document.getElementById('pdf-viewer')?.scrollTo({
      top: elementBoundingRect.top - 200,
      behavior: 'smooth',
    });
  }

  const highlightedBox = document.querySelector('.current-match');
  if (highlightedBox) {
    const elementBoundingRect = highlightedBox.getBoundingClientRect();
    document.getElementById('pdf-viewer')?.scrollTo({
      top: elementBoundingRect.top - 200,
      behavior: 'smooth',
    })
  }

  return highlightedMatches + matches;
}

export function PDFViewer({ url, type: documentType }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const { isMobile } = useCommonContext();
  const [scale, setScale] = useState<number>(isMobile ? 0.5 : 1);
  const [search, setSearch] = useState<string>('');
  const [matches, setMatches] = useState<number>(0);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [currentTool, setCurrentTool] = useState<'pointer' | 'text' | 'image'>('pointer');
  const documentContainerRef = useRef<HTMLDivElement>(null);
  const { closeContextMenu } = useContextMenu();

  const increaseZoom = useCallback(() => {
    if (scale < 2) {
      setScale(prev => prev + 0.1);
    }
  }, [scale]);
  const decreaseZoom = useCallback(() => {
    if (scale > 0.6) {
      setScale(prev => prev - 0.1);
    }
  }, [scale]);

  useListenToZoom({
    onIncreaseZoom: increaseZoom,
    onDecreaseZoom: decreaseZoom,
  });


  useEffect(() => {
    closeContextMenu();
  }, [currentTool]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  // Set up gesture handling
  useGesture(
    {
      onPinch: ({ distance: [d], direction: [dir], event }) => {
        // event?.preventDefault();
        // if (!(event instanceof WheelEvent)) return;
        if (!('deltaY' in event)) return;

        let currentScale = scale;
        const newScale = currentScale += event.deltaY * -0.01;
        setScale(newScale);
      },
    },
    {
      target: documentContainerRef,
      eventOptions: { passive: false }, // needed for preventing default
    }
  );

  const handleSearchChange = useCallback((search: string) => {
    setSearch(search);    
  }, []);

  useEffect(() => {
    if (documentContainerRef.current) {
      const newMatches = highlightAllOccurrences(search, selectedMatchIndex, documentContainerRef.current);
      setMatches(newMatches)
    }
  }, [search, selectedMatchIndex]);

  const handleNextMatch = useCallback(() => {
    // use mod operation to wrap around
    setSelectedMatchIndex(prev => (prev + 1) % matches);
  }, [matches]);

  const handlePreviousMatch = useCallback(() => {
    // use mod operation to wrap around
    setSelectedMatchIndex(prev => (prev - 1 + matches) % matches);
  }, [matches]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar - Fixed at top, z-index above document canvas so zoom dropdown is clickable */}
      <div className="relative z-[1100] bg-white border-b border-gray-200">
        <ViewerToolbar
          search={search}
          onSearchChange={handleSearchChange}
          matches={matches}
          selectedMatchIndex={selectedMatchIndex}
          onNextMatch={handleNextMatch}
          onPreviousMatch={handlePreviousMatch}
          scale={scale}
          onScaleChange={setScale}
          showPagination={false}
          currentPage={0}
          totalPages={numPages}
          onPageChange={() => {}}
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
        />
      </div>
      
      {/* Document Container - Scrollable (center when smaller, left-align when wider) */}
      <div id="pdf-viewer" className="bg-chat-panel flex-1 flex h-full overflow-y-scroll relative" style={{ userSelect: currentTool === 'text' ? 'contain' as const : 'none' }}>
        <ContextMenuProvider>
          <div className="mx-auto h-full" ref={documentContainerRef}>
          <Document
            key={url}
            file={url}
            className="flex flex-col gap-8"
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error('Error loading PDF:', error)}
            loading={
              <LoadingSpinnerWithType type={documentType as 'pdf' | 'image' | 'video'} className="w-full h-full bg-chat-panel" />
            }
            error={
              <div className="flex items-center justify-center w-full h-full bg-red-50">
                <div className="text-red-500">Error loading PDF</div>
              </div>
            }
          >
            {Array.from({ length: numPages }).map((_, index) => (
              <PageWrapper
                key={index}
                pageNumber={index + 1}
                scale={scale}
                currentTool={currentTool}
                isSearching={search.length > 0}
              />
              ))}
            </Document>
          </div>
        </ContextMenuProvider>
      </div>
    </div>
  );
}