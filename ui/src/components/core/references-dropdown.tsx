'use client';

import { useState } from 'react';
import { FileText, Sparkles, ChevronDown, ChevronUp, ImageIcon, Globe } from 'lucide-react';
import { Reference } from './general-chat';
import { LucideIcon } from 'lucide-react';

interface ReferencesDropdownProps {
  references: Reference[];
  position: 'top' | 'bottom';
}

function getReferenceIcon(type: Reference['type']): LucideIcon {
  switch (type) {
    case 'document':
      return FileText;
    case 'image':
      return ImageIcon;
    case 'url':
      return Globe;
    default:
      return FileText;
  }
}

export function ReferencesDropdown({ references, position }: ReferencesDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (references.length === 0) {
    return null;
  }

  const isTop = position === 'top';
  const containerClasses = isTop
    ? "mb-2 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-t-lg overflow-hidden"
    : "mt-2 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-b-lg overflow-hidden";

  return (
    <div className={containerClasses} data-testid="references-dropdown">
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        data-testid="references-dropdown-toggle"
        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100/50 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <div className="min-w-0 flex-1 text-left">
          <div className="text-xs text-gray-500 font-medium">
            {references.length} {references.length === 1 ? 'file' : 'files'}
          </div>
        </div>
        {isDropdownOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
        )}
      </button>
      
      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div className="px-3 py-2 border-t border-gray-200/50 bg-white/50" data-testid="references-dropdown-content">
          <div className="space-y-1.5">
            {references.map((reference: Reference) => {
              const Icon = getReferenceIcon(reference.type);
              return (
                <div
                  key={reference.id}
                  data-testid={`reference-${reference.id}`}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100/50 transition-colors"
                >
                  <Icon className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate flex-1" title={reference.title}>
                    {reference.title}
                  </span>
                  {reference.hasEmbeddings && (
                    <Sparkles className="w-3 h-3 text-blue-500 shrink-0" data-testid={`reference-${reference.id}-embedding-icon`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

