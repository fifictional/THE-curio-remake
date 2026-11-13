'use client';

import { useCallback, useState, useRef, useEffect, useMemo, ChangeEvent, ClipboardEventHandler } from 'react';
import { isValidYoutubeUrl } from '@/hooks/use-youtube-upload';
import { YoutubeModal } from '../modals/youtube-modal';
import { UploadModal } from '../modals/upload-modal';
import { useSessionContext } from '@/providers';
import { useCoreContext } from '@/providers/core-provider';
import { Send, Plus, UploadIcon, ImageIcon, YoutubeIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import { ReferencesDropdown } from './references-dropdown';

export interface Reference {
  id: string;
  title: string;
  type: 'document' | 'text' | 'image' | 'url'; // Add more types as needed
  hasEmbeddings?: boolean; // For documents with RAG embeddings
}

interface GeneralChatProps {
  // Uncontrolled mode (for starting new chats)
  onChatStarted?: (message: string) => void;
  // Controlled mode (for existing chats)
  message?: string;
  setMessage?: (message: string) => void;
  handleSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  // Common props
  disabled?: boolean;
  placeholder?: string;
  onDocumentUploadStarted?: () => void;
  defaultSpaceUuid?: string;
  references?: Reference[];
  showPlusButton?: boolean; // Option to hide plus button
  referencesPosition?: 'top' | 'bottom'; // Position for references dropdown
  readOnly?: boolean; // If true, disables input and actions
  // Error and loading states
  error?: string | null;
  isLoading?: boolean;
}

export function GeneralChat({
  // Uncontrolled mode
  onChatStarted,
  // Controlled mode
  message: controlledMessage,
  setMessage: controlledSetMessage,
  handleSubmit: controlledHandleSubmit,
  handleKeyDown: controlledHandleKeyDown,
  textareaRef: externalTextareaRef,
  // Common props
  disabled,
  placeholder,
  onDocumentUploadStarted,
  defaultSpaceUuid: propSpaceUuid,
  references = [],
  showPlusButton = true,
  referencesPosition = 'bottom',
  readOnly = false,
  // Error and loading states
  error,
  isLoading,
}: GeneralChatProps) {
  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledMessage !== undefined && controlledSetMessage !== undefined;

  // Internal state for uncontrolled mode
  const [internalMessage, setInternalMessage] = useState('');

  // Use controlled or internal state
  const message = isControlled ? controlledMessage : internalMessage;
  const setMessage = isControlled ? controlledSetMessage : setInternalMessage;
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'all' | 'image' | 'pdf'>('pdf');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [initialYoutubeUrl, setInitialYoutubeUrl] = useState<string | undefined>(undefined);
  const { defaultSpaceUuid: sessionSpaceUuid, userAttributes } = useSessionContext() as any;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultSpaceUuid = propSpaceUuid || sessionSpaceUuid;

  // Get document from context for references (used in chat context)
  const { document: contextDocument } = useCoreContext();

  // Calculate if message is multi-line from the string value
  // Check for explicit newlines
  const isMultiLine = message.includes('\n');

  // Combine context document references with passed references
  // Remove duplicates based on document ID
  const allReferences = useMemo<Reference[]>(() => {
    const refsMap = new Map<string, Reference>();

    // Add passed references first
    references.forEach(ref => {
      refsMap.set(ref.id, ref);
    });

    // Add context document if it exists and isn't already in the map
    if (contextDocument) {
      if (!refsMap.has(contextDocument.documentUuid)) {
        refsMap.set(contextDocument.documentUuid, {
          id: contextDocument.documentUuid,
          title: contextDocument.fileName,
          type: 'document',
          hasEmbeddings: contextDocument.hasRagEmbeddings === true,
        });
      }
    }

    return Array.from(refsMap.values());
  }, [references, contextDocument]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isControlled && onChatStarted) {
      if (message.startsWith('https://') && isValidYoutubeUrl(message)) {
        setInitialYoutubeUrl(message);
        setIsYoutubeModalOpen(true);
        return;
      }
    }
  }, [message])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // In controlled mode, use the provided handleSubmit
    if (isControlled && controlledHandleSubmit) {
      controlledHandleSubmit(e as React.FormEvent<HTMLFormElement>);
      return;
    }

    // In uncontrolled mode, handle chat creation
    if (!isControlled && onChatStarted) {
      // Intercept: if first message is a valid YouTube URL, open modal and skip chat creation
      // if (message.startsWith('https://') && isValidYoutubeUrl(message)) {
      //   setInitialYoutubeUrl(message);
      //   setIsYoutubeModalOpen(true);
      //   return;
      // }

      onChatStarted(message);
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value.slice(0, Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH)))
    // Intercept: if first message is a valid YouTube URL, open modal and skip chat creation
  }

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // In controlled mode, use the provided handleKeyDown
    if (isControlled && controlledHandleKeyDown) {
      controlledHandleKeyDown(e);
      return;
    }

    // In uncontrolled mode, handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSubmit(e);
      }
    }
  }, [message, onSubmit, isControlled, controlledHandleKeyDown, readOnly]);

  const handleDocumentAnalysis = () => {
    setUploadMode('pdf');
    setIsUploadModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleImageAnalysis = () => {
    setUploadMode('image');
    setIsUploadModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleYoutubeStudy = () => {
    setIsYoutubeModalOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* References Dropdown - Top position */}
      {referencesPosition === 'top' && (
        <ReferencesDropdown references={allReferences} position="top" />
      )}

      {/* Dropdown Menu - Outside form to avoid overflow issues */}
      {isDropdownOpen && (
        <div className="absolute bottom-full left-3 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50" data-testid="upload-dropdown-menu">
          <button
            type="button"
            onClick={handleDocumentAnalysis}
            disabled={disabled || readOnly}
            data-testid="upload-dropdown-document-analysis"
            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">Document Analysis</span>
          </button>
          <button
            type="button"
            onClick={handleImageAnalysis}
            disabled={disabled || readOnly}
            data-testid="upload-dropdown-image-analysis"
            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">Image Analysis</span>
          </button>
          <button
            type="button"
            onClick={handleYoutubeStudy}
            disabled={disabled || readOnly}
            data-testid="upload-dropdown-youtube-study"
            className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <YoutubeIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">Youtube Study</span>
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className={cn(
        "w-full relative",
      )}>
        <div className={cn(
          "relative border border-gray-300 bg-white transition-all duration-500",
          allReferences.length > 0 && referencesPosition === 'bottom' ? "rounded-b-none" :
            allReferences.length > 0 && referencesPosition === 'top' ? "rounded-t-none" : "rounded-4xl",
          isMultiLine
            ? "py-4 pt-4 pb-16 pr-12"
            : "py-4 pr-12",
          showPlusButton && !isMultiLine ? "pl-14" :
            showPlusButton && isMultiLine ? "pl-5" :
              !isMultiLine ? "pl-4" : "pl-4",
          isMultiLine && allReferences.length > 0 && referencesPosition === 'top' ? "rounded-b-3xl" :
            isMultiLine && allReferences.length > 0 && referencesPosition === 'bottom' ? "rounded-t-3xl" :
              isMultiLine ? "rounded-3xl" :
                allReferences.length > 0 && referencesPosition === 'top' ? "rounded-b-4xl" :
                  allReferences.length > 0 && referencesPosition === 'bottom' ? "rounded-t-4xl" :
                    "rounded-4xl",
        )}>
          <Textarea
            ref={externalTextareaRef}
            value={message}
            maxRows={10}
            minRows={1}
            onKeyDown={onKeyDown}
            onChange={onChange}
            placeholder={placeholder || "Ask anything..."}
            disabled={disabled}
            maxLength={Number(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH)}
            data-testid="chat-input"
            className={cn(
              "resize-none rounded-none w-full bg-transparent border-0 focus:outline-none focus:ring-0 focus:ring-offset-0 p-0",
              showPlusButton && !isMultiLine ? "pl-0" :
                showPlusButton && isMultiLine ? "pl-0" :
                  !isMultiLine ? "pl-0" : "pl-0"
            )}
          />

          {/* Plus Icon Button - Top left when single line */}
          {showPlusButton && !isMultiLine && (
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled}
              data-testid="upload-plus-button"
              className={cn(
                "absolute left-5 top-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-0",
              )}
              aria-label="Open upload options"
            >
              <Plus className="h-5 w-5 text-gray-500" />
            </button>
          )}

          {/* Plus Icon Button - Bottom left when multi-line */}
          {showPlusButton && isMultiLine && (
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled || readOnly}
              data-testid="upload-plus-button"
              className={cn(
                "absolute left-4 bottom-3 rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-0",
              )}
              aria-label="Open upload options"
            >
              <Plus className="h-5 w-5 text-gray-500" />
            </button>
          )}

          {/* Submit Button - Inside Textarea when single line, bottom right when multi-line */}
          {message.trim() && (
            <button
              type="submit"
              disabled={disabled || isLoading || !message.trim() || readOnly}
              aria-label="Send message"
              className={cn(
                "cursor-pointer inline-flex items-center justify-center rounded-full h-8 w-8 bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-0",
                isMultiLine
                  ? "absolute right-3 bottom-3"
                  : "absolute right-3 top-1/2 -translate-y-1/2",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Error Messages */}
      {error && (
        <div className="text-red-500 text-sm mt-2 px-2 text-center">
          {error}
        </div>
      )}

      {/* References Dropdown - Bottom position */}
      {referencesPosition === 'bottom' && (
        <ReferencesDropdown references={allReferences} position="bottom" />
      )}

      {/* Modals */}
      <YoutubeModal
        open={isYoutubeModalOpen}
        onOpenChange={setIsYoutubeModalOpen}
        spaceUuid={defaultSpaceUuid || ''}
        onUploadStarted={onDocumentUploadStarted || (() => { })}
        onUploadCompleted={() => { }}
        initialUrl={initialYoutubeUrl}
      />
      <UploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        userUuid={userAttributes?.userUuid || ''}
        mode={uploadMode}
        defaultSpaceUuid={defaultSpaceUuid}
        onUploadStarted={onDocumentUploadStarted || (() => { })}
      />
    </div>
  );
}


