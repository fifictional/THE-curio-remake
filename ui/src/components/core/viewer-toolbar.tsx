'use client';

import { ArrowBigUp, TextCursor, MousePointer2, SquareDashedMousePointer, Search, X } from 'lucide-react';
import { ZoomDropdown } from '@/components/ui/zoom-dropdown';
import { DocumentPagination } from '@/components/ui/document-pagination';
import { ToolButton } from '@/components/ui/tool-button';
import { FinderSearch } from '@/components/ui/finder-search';
import { useAnalytics, useCommonContext } from '@/providers';
import { useState } from 'react';

interface ViewerToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  matches?: number;
  selectedMatchIndex?: number;
  onNextMatch?: () => void;
  onPreviousMatch?: () => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  showPagination: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectTool?: () => void;
  onImageTool?: () => void;
  canSelectText?: boolean;
  currentTool: 'pointer' | 'text' | 'image';
  setCurrentTool: (tool: 'pointer' | 'text' | 'image') => void;
}

export function ViewerToolbar({
  search,
  onSearchChange,
  matches,
  selectedMatchIndex,
  onNextMatch,
  onPreviousMatch,
  scale,
  onScaleChange,
  showPagination,
  currentPage,
  totalPages,
  onPageChange,
  onSelectTool,
  onImageTool,
  canSelectText = true,
  currentTool = 'pointer',
  setCurrentTool,
}: ViewerToolbarProps) {
  const { track } = useAnalytics();
  const { isMobile } = useCommonContext();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  return (
    <div className="relative flex items-center justify-between px-4 md:pl-8 py-1 bg-white">
      <div className="flex items-center gap-2">
        <ZoomDropdown value={scale} onChange={(scale) => {
          track('viewer-toolbar-zoom-changed', {
            scale,
          });
          onScaleChange(scale);
        }} />
        {canSelectText && (
          isMobile ? (
            <>
              <ToolButton
                icon={Search}
                label="Search"
                onClick={() => setShowMobileSearch(true)}
                isActive={showMobileSearch}
                showShortcut={false}
              />
              {showMobileSearch && (
                <div className="absolute inset-x-0 top-0 z-50 bg-white border-b border-gray-200 shadow px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FinderSearch
                      className="text-gray-500"
                      matches={matches}
                      selectedMatchIndex={selectedMatchIndex}
                      onNextMatch={onNextMatch}
                      onPreviousMatch={onPreviousMatch}
                      containerClassName="flex-1"
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-full p-2 text-gray-600 hover:bg-gray-100"
                      onClick={() => setShowMobileSearch(false)}
                      aria-label="Close search"
                    >
                      <X className="w-5 h-5 bg-gray-100 rounded-full p-1" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <FinderSearch className="text-gray-500" matches={matches} selectedMatchIndex={selectedMatchIndex} onNextMatch={onNextMatch} onPreviousMatch={onPreviousMatch} containerClassName="w-64" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          )
        )}
      </div>

      {showPagination && (
        <DocumentPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            track('viewer-toolbar-page-changed', {
              page,
            });
            onPageChange(page);
          }}
        />
      )}

      <div className="flex items-center gap-2 relative">
        <ToolButton
          icon={MousePointer2}
          label="Pointer"
          onClick={() => {
            track('viewer-toolbar-pointer-tool-clicked');
            setCurrentTool?.('pointer');
            onSelectTool?.();
          }}
          disabled={!canSelectText}
          isActive={currentTool === 'pointer'}
          showShortcut={false}
          shortcutIcon={<ArrowBigUp className="w-3 h-3" />}
        />
        <ToolButton
          icon={TextCursor}
          label="Select Text"
          onClick={() => {
            track('viewer-toolbar-select-text-tool-clicked');
            setCurrentTool?.('text');
            onSelectTool?.();
          }}
          disabled={!canSelectText}
          isActive={currentTool === 'text'}
          showShortcut={false}
          shortcutIcon={<ArrowBigUp className="w-3 h-3" />}
        />
        <ToolButton
          icon={SquareDashedMousePointer}
          label="Image Tool"
          onClick={() => {
            track('viewer-toolbar-image-tool-clicked');
            setCurrentTool?.('image');
            onImageTool?.();
          }}
          isActive={currentTool === 'image'}
          showShortcut={false}
          shortcutIcon={<ArrowBigUp className="w-3 h-3" />}
        />
        
      </div>
    </div>
  );
} 