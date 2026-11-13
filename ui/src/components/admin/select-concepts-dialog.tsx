"use client";

import { useState, useEffect } from "react";
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useConceptsAdminApi, type Concept } from "@/hooks/api/knowledge-base/use-concepts-admin.api";

interface SelectConceptsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  selectedConceptIds: string[];
  onSave: (conceptIds: string[]) => Promise<void>;
}

export function SelectConceptsDialog({
  isOpen,
  onClose,
  examId,
  selectedConceptIds,
  onSave,
}: SelectConceptsDialogProps) {
  const { concepts, isLoading, fetchConcepts } = useConceptsAdminApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedConceptIds));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConcepts();
    }
  }, [isOpen, fetchConcepts]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(selectedConceptIds));
      setSearchTerm("");
    }
  }, [isOpen, selectedConceptIds]);

  const filteredConcepts = concepts.filter((concept) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      concept.id.toLowerCase().includes(search) ||
      concept.displayName.toLowerCase().includes(search) ||
      (concept.description || "").toLowerCase().includes(search)
    );
  });

  const handleToggleConcept = (conceptId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(conceptId)) {
      newSelected.delete(conceptId);
    } else {
      newSelected.add(conceptId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      onClose();
    } catch (err) {
      alert("Failed to save concept links. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Select Concepts
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-1">
                  Select concepts to link to this exam ({selectedIds.size} selected)
                </p>
              </div>
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4 text-gray-800" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {/* Search Input */}
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search concepts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Concepts List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-gray-600">
                  Loading concepts...
                </div>
              ) : filteredConcepts.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-600">
                  {searchTerm ? "No concepts found matching your search." : "No concepts available."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConcepts.map((concept) => (
                    <div
                      key={concept.id}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleToggleConcept(concept.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(concept.id)}
                        onCheckedChange={() => handleToggleConcept(concept.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {concept.displayName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {concept.id}
                        </div>
                        {concept.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {concept.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

