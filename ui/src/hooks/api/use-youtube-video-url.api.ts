import { useQuery } from "@tanstack/react-query";
import { useAmplifyApiClient } from "@/providers/amplify-provider";

export const useYoutubeVideoUrlApi = (youtubeVideoUuid: string) => {
  const client = useAmplifyApiClient();

  const getYoutubeVideoUrl = async (youtubeVideoUuid: string) => {
    const response = await client.models.YoutubeVideo.get({ youtubeVideoUuid });
    return response.data?.videoId;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['youtubeVideoUrl', youtubeVideoUuid],
    queryFn: () => getYoutubeVideoUrl(youtubeVideoUuid)
  });

  return {
    youtubeVideoId: data,
    isLoading,
    error,
  };
};