export type PaginatedQueryResult<T> = {
  pages: { data: T[], nextToken?: string }[],
}