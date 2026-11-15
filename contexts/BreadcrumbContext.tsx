"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

/**
 * What to call the record a dynamic route segment points at, so a breadcrumb
 * never prints an id at a person. The header is layout and cannot know the name,
 * so the route tells it: whichever component resolved the record calls
 * `useBreadcrumbTitle(name)`.
 *
 * Three states, not two. Mounting the hook claims the crumb, which is what
 * separates the two kinds of null:
 *
 *   claimed, no title yet   the route owns this and is fetching  -> a skeleton
 *   claimed, title          the record resolved                  -> the name
 *   never claimed           nothing will ever tell us            -> "Details"
 *
 * A context rather than Next's parallel `@breadcrumb` slot: this app
 * authenticates with a Bearer token read by axios in the browser against a
 * separate Laravel host, so a server component would forward that cookie to
 * re-fetch what the client fetches a moment later.
 */

interface BreadcrumbState {
  /** A route has taken responsibility for naming this record. */
  claimed: boolean;
  /** The name, once it is known. */
  title: string | null;
}

interface BreadcrumbContextValue extends BreadcrumbState {
  setState: (state: BreadcrumbState) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BreadcrumbState>({ claimed: false, title: null });

  const value = useMemo(
    () => ({ claimed: state.claimed, title: state.title, setState }),
    [state.claimed, state.title]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Read the crumb. Returns the unclaimed state outside the provider rather than
 * throwing: the breadcrumb is chrome, and a missing provider must not take the
 * whole header down with it.
 */
export function useBreadcrumbState(): BreadcrumbState {
  const context = useContext(BreadcrumbContext);

  return { claimed: context?.claimed ?? false, title: context?.title ?? null };
}

/**
 * Before paint: `useEffect` runs after it, so the first frame would show the
 * "Details" fallback and the skeleton would replace it a frame later. Falls back
 * to `useEffect` on the server, the standard isomorphic guard.
 */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Name the record this route is showing. Call it unconditionally, including
 * while the record is loading: the call is the claim, and passing `null` until
 * the name arrives is what gets a skeleton rather than a word naming nothing.
 * Cleared on unmount, so navigating away leaves no stale name behind.
 */
export function useBreadcrumbTitle(title: string | null | undefined): void {
  const context = useContext(BreadcrumbContext);
  const setState = context?.setState;

  useIsomorphicLayoutEffect(() => {
    if (!setState) return;

    setState({ claimed: true, title: title ?? null });

    return () => setState({ claimed: false, title: null });
  }, [title, setState]);
}
