import { useCallback, useState } from "react";
import { FileItem } from "@/components/ui/file-browser/file-item";

interface FileBrowserProps {
  files: FileItem[];
}

export const useFileBrowser = ({ files }: FileBrowserProps) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const toggleSelectAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((file) => file.id));
    }
  }, [files, selectedFiles]);

  const toggleSelect = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedFiles((prev) => 
      prev.includes(id) ? prev.filter((file) => file !== id) : [...prev, id]
    );
  }, []);

  return {
    selectedFiles,
    toggleSelect,
    toggleSelectAll,
  };
};