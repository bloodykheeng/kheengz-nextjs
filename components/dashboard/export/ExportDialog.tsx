"use client";

import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { ProgressBar } from "primereact/progressbar";
import { collectAll, writeRows, type ExportColumn } from "@/lib/exportRows";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";

export type ExportPageFetcher<T> = (page: number, perPage: number) => Promise<{ data: T[]; meta: { last_page: number; total?: number } }>;

/**
 * The one way out of a list (Alpha's ExportButton): opening it walks every page
 * matching the list's current filters, 100 rows at a time, while it counts what
 * has arrived; then Excel and CSV are written from those same rows, so the two
 * files can never disagree and nothing is fetched twice. Closing it stops the
 * walk and drops the rows.
 */
export default function ExportDialog<T>({
  visible,
  onHide,
  fileName,
  fetchPage,
  columns,
  filtersSummary,
}: {
  visible: boolean;
  onHide: () => void;
  fileName: string;
  fetchPage: ExportPageFetcher<T>;
  columns: ExportColumn<T>[];
  /** What the export covers, in words: "Status: Paid · Search: Aisha". */
  filtersSummary?: string;
}) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [progress, setProgress] = useState<{ page: number; lastPage: number }>({ page: 0, lastPage: 1 });
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  // A fresh start each time it opens, before the paint (no flash of the last export).
  useResetOnOpen(visible, "", () => {
    setRows(null);
    setError(null);
    setProgress({ page: 0, lastPage: 1 });
  });

  // Reads the fetcher of the moment the dialog opened, which carries that moment's filters,
  // without the effect re-running every time the parent hands down a new function.
  const collect = useEffectEvent((mine: number) => {
    collectAll(fetchPage, (page, lastPage) => mine === run.current && setProgress({ page, lastPage }))
      .then((all) => mine === run.current && setRows(all))
      .catch(() => mine === run.current && setError("The export could not be fetched. Check your connection and try again."));
  });

  useEffect(() => {
    if (!visible) return;
    collect(++run.current);
    // Closing (or leaving the page) abandons this run: its late answers are ignored.
    return () => {
      run.current += 1;
    };
  }, [visible]);

  const percent = Math.round((progress.page / Math.max(1, progress.lastPage)) * 100);

  return (
    <Dialog header="Export" visible={visible} onHide={onHide} style={{ width: "min(28rem, 95vw)" }} modal>
      <div className="space-y-4 text-sm">
        <p className="text-(--text-secondary)">
          Every record matching the list as it is filtered now{filtersSummary ? `: ${filtersSummary}` : ", across all pages"}.
        </p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>
        ) : rows === null ? (
          <div className="space-y-2">
            <ProgressBar value={percent} showValue={false} style={{ height: "0.5rem" }} />
            <p className="text-xs text-(--text-muted)">
              Fetching page {Math.max(1, progress.page)} of {progress.lastPage}…
            </p>
          </div>
        ) : (
          <p className="font-medium text-(--text-primary)">{rows.length.toLocaleString("en-US")} records ready.</p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Close" onClick={onHide} />
          <Button type="button" outlined icon="pi pi-file" label="CSV" disabled={!rows?.length} onClick={() => rows && writeRows(rows, columns, fileName, "csv")} />
          <Button type="button" icon="pi pi-file-excel" label="Excel" disabled={!rows?.length} onClick={() => rows && writeRows(rows, columns, fileName, "xlsx")} />
        </div>
      </div>
    </Dialog>
  );
}

/** A standalone Export button for screens that are not a table (cards, grids). */
export function ExportButton<T>(props: Omit<React.ComponentProps<typeof ExportDialog<T>>, "visible" | "onHide"> & { label?: string }) {
  const [open, setOpen] = useState(false);
  const { label = "Export", ...dialog } = props;
  return (
    <>
      <Button type="button" size="small" outlined icon="pi pi-download" label={label} onClick={() => setOpen(true)} />
      <ExportDialog {...dialog} visible={open} onHide={() => setOpen(false)} />
    </>
  );
}
