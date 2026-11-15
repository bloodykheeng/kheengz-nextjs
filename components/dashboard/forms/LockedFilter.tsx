"use client";

import React from "react";

/**
 * A filter the page has already decided.
 *
 * Inside an edition's or a school's page the list is that record's, so the
 * dialog shows it filled in and locked rather than hiding it: a reader
 * opening Filters sees what the list is narrowed to, and cannot widen it
 * from here. It is not a filter they chose, so it is not counted as one.
 */
export default function LockedFilter({ label, name, note }: { label: string; name: string; note: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">{label}</p>
      <p className="rounded-lg border border-(--border-color) bg-(--bg-page) px-3 py-2 text-sm text-(--text-secondary)">
        {name}
        <span className="mt-0.5 block text-xs text-(--text-muted)">{note}</span>
      </p>
    </div>
  );
}
