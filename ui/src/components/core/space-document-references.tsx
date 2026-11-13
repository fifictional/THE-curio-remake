'use client';

import { useState, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useDocumentsBySpaceApi } from '@/hooks/api/documents/use-documents-by-space.api';
import { ToggleLabel } from '@/components/ui';
import { StudentDocumentWithSummary } from '@/lib/types/document';

interface SpaceDocumentReferencesProps {
  spaceUuid: string | null;
  enabled: boolean;
  documents: StudentDocumentWithSummary[];
  onToggle: (enabled: boolean) => void;
}

export function SpaceDocumentReferences({ spaceUuid, enabled, onToggle, documents }: SpaceDocumentReferencesProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const referenceCount = documents.length;

  if (!spaceUuid || referenceCount === 0) {
    return null;
  }

  return (
    <div className="mx-4 bg-gray-900 backdrop-blur-sm border border-gray-200/50 border-b-0 rounded-t-lg overflow-hidden">
      {/* Header - Always Visible */}
      <div className="px-3 py-2 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 font-medium">
            {referenceCount} {referenceCount === 1 ? 'file' : 'files'}
          </div>
        </div>
        <ToggleLabel
          text="Reference"
          size="sm"
          selected={enabled}
          onClick={() => onToggle(!enabled)}
        />
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-1 hover:bg-gray-100/50 rounded transition-colors"
        >
          {isDropdownOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          )}
        </button>
      </div>
      
      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div className="px-3 py-2 border-t border-gray-200/50 bg-white/50">
          <div className="space-y-1.5">
            {documents.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-1">No files available</div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.documentUuid}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100/50 transition-colors"
                >
                  <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate flex-1" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                  <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

