export type StudentDocument = {
  documentUuid: string;
  spaceUuid: string;
  userUuid: string;
  type: string;
  key: string;
  originalKey: string;
  documentCount: number;
  youtubeVideoUuid?: string | null;
};

export type GetYoutubeVideoResponse = {
  youtubeVideoUuid: string;
  videoId: string;
  title: string;
  transcriptKey: string;
}