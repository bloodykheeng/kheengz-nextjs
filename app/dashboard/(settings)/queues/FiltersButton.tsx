"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { InputText } from "primereact/inputtext";
import { useResetWhen } from "@/hooks/useResetOnOpen";

export interface QueueFilters {
  queueName: string;
}

interface FiltersButtonProps {
  filters: QueueFilters;
  onApply: (filters: QueueFilters) => void;
  onClear: () => void;
}

export default function FiltersButton({ filters, onApply, onClear }: FiltersButtonProps) {
  const [visible, setVisible] = useState(false);
  const [queueName, setQueueName] = useState(filters.queueName);

  // The field follows the list's filter (a chip cleared, Back) before the paint.
  useResetWhen(String(filters.queueName ?? ""), () => setQueueName(filters.queueName));

  const activeCount = filters.queueName ? 1 : 0;

  const handleApply = () => {
    onApply({ queueName: queueName.trim() });
    setVisible(false);
  };

  const handleClear = () => {
    setQueueName("");
    onClear();
    setVisible(false);
  };

  return (
    <>
      <button
        onClick={() => setVisible(true)}
        title="Filters"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-(--border-color) bg-(--bg-card) text-(--text-muted) transition-colors hover:bg-(--bg-page)"
      >
        <i className="pi pi-filter text-base" />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          </span>
        )}
      </button>

      <Dialog maximizable
        header="Filters"
        visible={visible}
        onHide={() => setVisible(false)}
        style={{ width: "min(22rem, 95vw)" }}
        pt={{ header: { className: "pb-2!" } }}
      >
        <div className="space-y-5 pt-1">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Queue name
            </p>
            <InputText
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
              placeholder="Filter by queue"
              className="w-full text-sm"
            />
            <small className="text-(--text-muted)">Exact match on the queue column.</small>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              label="Apply"
              icon="pi pi-check"
              size="small"
              className="flex-1"
              onClick={handleApply}
            />
            <Button
              label="Clear all"
              icon="pi pi-times"
              size="small"
              severity="secondary"
              outlined
              onClick={handleClear}
              disabled={activeCount === 0}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
