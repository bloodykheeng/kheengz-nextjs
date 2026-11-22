"use client";

import { useState } from "react";
import { useResetWhen } from "@/hooks/useResetOnOpen";

/**
 * Ticked rows that belong to the rows on screen (coding-notes mrdrs-lessons, "for the next system" 7): the ticks
 * clear whenever the list's page, search, sort or filters change (`listKey`), and only ticked rows still shown
 * count, so a search never leaves "Delete (4)" over one row and a refetch never acts on a row that left.
 *
 *   const [ticked, setTicked] = useTicked(rows, `${page}:${pageSize}:${search}:${sort}:${filters}`);
 */
export function useTicked<T extends { id: string }>(rows: T[], listKey: string): [T[], (next: T[]) => void] {
  const [ticked, setTicked] = useState<T[]>([]);
  useResetWhen(listKey, () => setTicked([]));
  const shown = new Set(rows.map((r) => r.id));
  return [ticked.filter((t) => shown.has(t.id)), setTicked];
}
