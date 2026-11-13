import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

type ItemApiOptions<T> = {
  key: string;
  getItemFunc: (itemUuid: string) => Promise<{ data: T | null }>;
  on404?: () => void;
}

export function useItemApi<T>(itemUuid: string | null, {
  key,
  getItemFunc,
  on404,
}: ItemApiOptions<T>) {
  const getItem = useCallback(async (itemUuid: string) => {
    const item = await getItemFunc(itemUuid);

    if (!item?.data) {
      on404?.();
      return null;
    }

    return item.data;
  }, []);

  return useQuery({
    queryKey: [key, itemUuid],
    // always not-null because of enabled: !!itemUuid
    queryFn: () => getItem(itemUuid!),
    enabled: !!itemUuid,
  });
}