"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { FiDownload } from "react-icons/fi";
import ExportDialog, { type ExportPageFetcher } from "@/components/dashboard/export/ExportDialog";
import type { ExportColumn } from "@/lib/exportRows";

/**
 * Export for a list that is not a table (cards, a grid of messages): the same
 * ExportDialog a table's Export opens, walking every page of the list as it is
 * filtered now, then Excel or CSV.
 */
export default function ExportButton<T>({
  fileName,
  fetchPage,
  columns,
  filtersSummary,
  disabled,
}: {
  fileName: string;
  fetchPage: ExportPageFetcher<T>;
  columns: ExportColumn<T>[];
  filtersSummary?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="small"
        severity="secondary"
        outlined
        icon={<FiDownload className="mr-2 text-sm" />}
        label="Export"
        tooltip="Export all matching records"
        tooltipOptions={{ position: "top" }}
        disabled={disabled}
        onClick={() => setOpen(true)}
      />
      <ExportDialog<T> visible={open} onHide={() => setOpen(false)} fileName={fileName} fetchPage={fetchPage} columns={columns} filtersSummary={filtersSummary} />
    </>
  );
}
