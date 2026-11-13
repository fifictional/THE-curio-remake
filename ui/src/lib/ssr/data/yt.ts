export type FetchYoutubeVideo = {
  videoUrl: string,
  spaceUuid?: string | null,
}

export type StoreYoutubeVideo = {
  videoId: string,
  title: string,
  thumbnailUrl: string, 
  spaceUuid?: string | null,
}