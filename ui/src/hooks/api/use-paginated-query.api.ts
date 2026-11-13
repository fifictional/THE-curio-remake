import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

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
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (data) {
      options.onData?.(data.pages.flatMap((page) => page.data));
    }
  }, [data, options.onData]);

  const loadNextPage = useCallback(() => {
    fetchNextPage();
  }, [refetch]);

  return {
    isLoading: isLoading || isFetchingNextPage,
    data,
    loadNextPage,
    hasNextPage,
    refetch,
  };
};