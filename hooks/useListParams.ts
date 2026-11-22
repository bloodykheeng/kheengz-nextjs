"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useAppRouter } from "@/hooks/useAppRouter";
import { rememberListUrl } from "@/lib/listReturn";

export const DEFAULT_PAGE = 1;

/**
 * Five rows by default. Ten made the first view of every list scroll, and the
 * paginator offers 10/25/50/100 for anyone who wants more.
 */
export const DEFAULT_PAGE_SIZE = 5;

/**
 * URL-backed state for a list page.
 *
 * Keeping page / search / filters / sort in the query string makes a filtered
 * view shareable, survives a refresh, and lets Back step through changes.
 *
 * **`sort` has no client-side default on purpose.** An absent `sort` param *is*
 * the third state of the column sort: "no sort, use the server's own order".
 * Defaulting it here would re-apply a sort the instant the param cleared, making
 * that state unreachable; the server owns the natural order via `defaultSort()`.
 * See kheengz-laravel/docs/list-sorting-3-state.md.
 */
export function useListParams(defaultPageSize = DEFAULT_PAGE_SIZE) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useAppRouter();

  const page = Number(searchParams.get("page")) || DEFAULT_PAGE;
  const pageSize = Number(searchParams.get("pageSize")) || defaultPageSize;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "";

  const first = (page - 1) * pageSize;

  // Back to the list where it was left (lib/listReturn.ts): its page, filters and search, for this tab.
  const query = searchParams.toString();
  useEffect(() => rememberListUrl(pathname, query), [pathname, query]);

  /** Writes params; an empty value removes the key so URLs stay clean. */
  const pushParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        const asString = String(value);
        if (asString) params.set(key, asString);
        else params.delete(key);
      });
      const qs = params.toString();
      // A new page, filter or sort of the same list keeps the reader where they are: Next scrolls to the
      // top on a push by default, which threw them off the list they were paging (hooks/useScrollMemory.ts).
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  /** Any change that alters the result set must return to page 1. */
  const setFilters = useCallback(
    (updates: Record<string, string | number>) =>
      pushParams({ ...updates, page: DEFAULT_PAGE }),
    [pushParams]
  );

  const getParam = useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams]
  );

  /**
   * What PrimeReact needs to render the header arrow. With no `sort` param there
   * is no active column, so no arrow, the neutral state reads correctly.
   */
  const sortField = sort ? sort.replace(/^-/, "") : undefined;
  const sortOrder: 1 | -1 = sort.startsWith("-") ? -1 : 1;

  return {
    page,
    pageSize,
    search,
    status,
    sort,
    sortField,
    sortOrder,
    first,
    getParam,
    pushParams,
    setFilters,
  };
}

/**
 * Maps a PrimeReact 3-state column sort onto the `sort` param.
 *
 * `removableSort` gives the third click `sortOrder` 0/null, that becomes an
 * empty string, which `pushParams` drops, returning the list to the server's
 * default order. Never emit a sentinel like `none`.
 */
export function columnSortToParam(
  sortField: string | undefined,
  sortOrder: number | null | undefined
): string {
  if (!sortField || !sortOrder) return "";
  return sortOrder === -1 ? `-${sortField}` : String(sortField);
}
