import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

type PaginatedQueryOptions<T> = {
  queryKey: string[];
  queryFn: (nextPageToken: string) => Promise<any>;
  options: {
    enabled: boolean;
    onData?: (data: T[]) => void;
  };
}

export const usePaginatedQuery = <T>(props: PaginatedQueryOptions<T>) => {
  const { queryKey, queryFn, options } = props;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<
    { pages: { data: T[] }[], nextToken?: string },
    Error,
    { pages: { data: T[] }[], nextToken?: string },
    typeof queryKey,
    string | undefined
  >({
    queryKey,
    enabled: options.enabled,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => queryFn(pageParam || ''),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    // Don’t aggressively refetch on focus/mount; keeps UX snappy on navigation.
    // `refetchOnMount: true` forced a refetch on every remount regardless of
    // freshness, which multiplied the /db traffic on each render.
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // `onData` is usually an inline arrow function, so including it in the deps
  // re-ran this effect on every render; when onData calls setState that is an
  // infinite render loop (the chat input could not accept keystrokes).
  // Keep the callback in a ref and depend on the data alone.
  const onDataRef = useRef(options.onData);
  onDataRef.current = options.onData;

  useEffect(() => {
    if (data) {
      onDataRef.current?.(data.pages.flatMap((page) => page.data));
    }
  }, [data]);

  const loadNextPage = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return {
    isLoading: isLoading || isFetchingNextPage,
    data,
    loadNextPage,
    hasNextPage,
    refetch,
  };
};