'use client';

import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface QuestionEditPanelFooterProps {
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function QuestionEditPanelFooter({
  isSaving,
  onClose,
  onSave,
}: QuestionEditPanelFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 p-2 px-6 border-t bg-gray-50">
      <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}

