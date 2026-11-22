"use client";

import { useHydrated } from "@/hooks/useHydrated";

/**
 * Back to the list where you left it (Letshego, 10 Nov 2026: on page 3 of a list, opened a record, pressed the
 * list's link and landed on page 1). Each list page remembers its own address, page, filters and search
 * included (useListParams writes it as the list changes), for this tab only; a record's back link and the
 * breadcrumb read it. The sidebar still opens a list fresh.
 */
const KEY = "list-return:";

/** Remember a list page's address (its path with the query string), for this browser tab. */
export function rememberListUrl(pathname: string, query: string): void {
  try {
    sessionStorage.setItem(KEY + pathname, query ? `${pathname}?${query}` : pathname);
  } catch {
    // Private windows and blocked storage: the list then opens fresh, as before.
  }
}

/** Where a list was left, or the list itself. */
export function listReturnUrl(path: string): string {
  try {
    return sessionStorage.getItem(KEY + path) ?? path;
  } catch {
    return path;
  }
}

/**
 * The address to go back to a list: the bare path on the server and the first paint (no storage there, and the
 * markup must match), then where it was left once hydrated.
 */
export function useListReturn(path: string): string {
  const hydrated = useHydrated();
  return hydrated ? listReturnUrl(path) : path;
}
