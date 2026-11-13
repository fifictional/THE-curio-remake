// Re-export Task from shared location
export type { Task } from "../../../utils/process-document/types";

export type StudendDocument = {
  documentUuid: string;
  spaceUuid: string;
  userUuid: string;
  type: string;
  key: string;
  originalKey: string;
  fileName: string;
  youtubeVideoUuid?: string | null;
};