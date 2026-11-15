"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

/**
 * False on the server and during hydration, true from the browser's next render on. For UI that
 * depends on what only the browser knows (the session cookie, the theme), so the server's HTML
 * and the first browser render agree and React reports no hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
