"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

function greetingNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * "Good morning" by the viewer's own clock. The clock is read in the browser only: the server
 * (and the prerendered page) says "Welcome", so the HTML never carries the hour the page was
 * built at and hydration never sees two different greetings.
 */
export function useTimeGreeting(): string {
  return useSyncExternalStore(subscribeToNothing, greetingNow, () => "Welcome");
}
