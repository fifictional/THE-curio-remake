
export interface FileItem {
    id: string;
    key: string;
    originalKey: string | null;
    name: string;
    spaceName: string;
    spaceUuid: string | null;
    type: string;
    folder: string;
    date: Date;
    tags: string[];
    userUuid?: string | null;
    isUploading: boolean;
    isDeleting: boolean;
    isMoving: boolean;
    isProcessing: boolean;
    isProcessingExtras: boolean;
    isPending: boolean;
    isFailed: boolean;
  }