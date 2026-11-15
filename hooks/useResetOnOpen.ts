"use client";

import { useState } from "react";

/**
 * Put a dialog's own fields back to what is in force, the moment it opens.
 *
 * ## WHY NOT AN EFFECT
 *
 * Every dialog here used to do this in a `useEffect` keyed on `visible`, and an
 * effect runs AFTER the browser has painted. So opening a shared dialog on a
 * second row drew the FIRST row's values for a frame and then corrected itself,
 * and the correction is the part a reader notices.
 *
 * Setting state while rendering the same component is React's own answer: it
 * throws the returned JSX away and re-runs the component before the paint, so
 * the stale frame never reaches the screen.
 * https://react.dev/learn/you-might-not-need-an-effect
 *
 * ## WHY NOT A `key`
 *
 * Remounting on a key resets everything, including a half-typed note, whenever
 * the key moves. Several of these dialogs deliberately survive the list behind
 * them refetching. This resets exactly when the effect it replaces did and at
 * no other time.
 *
 * @param open       whether the dialog is showing
 * @param signature  what the fields are seeded FROM, as one string. Reopening on
 *                   a different row must change it, or the second row inherits
 *                   the first one's values.
 * @param reset      seeds the fields. Called during render, so it may only set
 *                   this component's own state.
 */
export function useResetOnOpen(
  open: boolean,
  signature: string,
  reset: () => void,
): void {
  useResetWhen(`${open}|${signature}`, () => {
    if (open) {
      reset();
    }
  });
}

/**
 * The same thing without the open switch: put state back whenever `signature`
 * changes, before the paint rather than after it.
 *
 * For the resets that are not about a dialog opening, such as collapsing a
 * disclosure panel when the record under it changes.
 */
export function useResetWhen(signature: string, reset: () => void): void {
  const [applied, setApplied] = useState<string | null>(null);

  if (signature !== applied) {
    setApplied(signature);
    reset();
  }
}
