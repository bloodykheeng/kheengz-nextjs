"use client";

import React from "react";

/**
 * What a filter chip shows while the name behind its id is still being fetched,
 * and never the word for the kind of thing: `{voteName ?? "Vote"}` reads "Vote"
 * until the request lands, which tells the reader the list is filtered to
 * something called Vote.
 *
 * Three states, and the third is why this is a component:
 *
 * 1. Named: show it.
 * 2. Still fetching: a pulsing pill the width of a name.
 * 3. Fetched and nothing came back: the generic word, which is now honest, an
 *    endless pulse saying the opposite.
 *
 * The pill takes its colour from the chip through `bg-current`, so it works in
 * every chip colour and in dark mode without a second class.
 */
export default function FilterChipLabel({
  name,
  loading,
  fallback,
  className,
}: {
  /** The resolved name, or undefined while it is unknown. */
  name: string | undefined | null;
  /** Whether the query that would resolve it is still in flight. */
  loading: boolean;
  /** The kind of thing, shown only once the lookup has finished empty. */
  fallback: string;
  /** For long names: the caller passes its own `max-w-* truncate`. */
  className?: string;
}) {
  if (name) {
    return (
      <span className={className} title={name}>
        {name}
      </span>
    );
  }

  if (loading) {
    return (
      <>
        <span
          className="inline-block h-3 w-20 animate-pulse rounded-full bg-current/25"
          aria-hidden="true"
        />
        <span className="sr-only">Loading the name of this filter</span>
      </>
    );
  }

  return <>{fallback}</>;
}
