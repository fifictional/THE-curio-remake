import { useCallback, useState } from "react";
import { Input } from "../ui/input";
import { XIcon, CheckIcon, Loader2 } from "lucide-react";
import { CurioPanel } from "@/design-system/curio-panel";
import { CurioPanelHeader } from "@/design-system/curio-panel-header";
import { CurioPanelTitle, CurioPanelSubtitle } from "@/design-system/curio-panel-header";
import { CurioButton } from "@/design-system/curio-button";

export const SpaceForm = ({
  originalSpaceName,
  isSaving,
  handleSaveSpace,
  handleCancelSaveSpace,
}: {
  originalSpaceName: string;
  isSaving: boolean;
  handleSaveSpace: ({ newName }: { newName: string }) => void;
  handleCancelSaveSpace: () => void;
}) => {
  const [tempSpaceName, setTempSpaceName] = useState(originalSpaceName);

  const handleSave = useCallback(() => {
    if (tempSpaceName.trim().length > 0) {
      handleSaveSpace({ newName: tempSpaceName.trim() });
    }
  }, [handleSaveSpace, tempSpaceName]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempSpaceName.trim().length > 0) {
      e.preventDefault();
      handleSaveSpace({ newName: tempSpaceName.trim() });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelSaveSpace();
    }
  }, [tempSpaceName, handleSaveSpace, handleCancelSaveSpace]);

  const isNameEmpty = tempSpaceName.trim().length === 0;

  return (
    <CurioPanel border={true} className="w-full sm:w-80" padding="md">
      <CurioPanelHeader>
        <CurioPanelTitle className="text-base mb-2">
          <Input 
            className="w-full" 
            value={tempSpaceName} 
            onChange={(e) => setTempSpaceName(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="New folder" 
            autoFocus 
            data-testid="space-form-input"
            disabled={isSaving}
            />
        </CurioPanelTitle>
        <CurioPanelSubtitle className="flex flex-row gap-2 items-center">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saving...</span>
            </>
          ) : (
            <>
              <CurioButton size="sm" color="primary" onClick={handleSave} disabled={isNameEmpty} data-testid="space-form-save-button">
                Save <CheckIcon className="w-4 h-4 ml-2" />
              </CurioButton>
              <CurioButton size="sm" variant="outline" onClick={handleCancelSaveSpace} data-testid="space-form-cancel-button">
                Cancel <XIcon className="w-4 h-4 ml-2" />
              </CurioButton>
            </>
          )}
        </CurioPanelSubtitle>
      </CurioPanelHeader>
    </CurioPanel>
  )
};