"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { useResetWhen } from "@/hooks/useResetOnOpen";

export interface AuditFilters {
  logName: string;
  startDate: string;
  endDate: string;
}

interface FiltersButtonProps {
  filters: AuditFilters;
  onApply: (filters: AuditFilters) => void;
  onClear: () => void;
}

/** `<input type="date">`-style `YYYY-MM-DD`, which is what the API filters expect. */
function toApiDate(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromApiDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function FiltersButton({ filters, onApply, onClear }: FiltersButtonProps) {
  const [visible, setVisible] = useState(false);
  const [logName, setLogName] = useState(filters.logName);
  const [startDate, setStartDate] = useState<Date | null>(fromApiDate(filters.startDate));
  const [endDate, setEndDate] = useState<Date | null>(fromApiDate(filters.endDate));

  // The fields follow the list's filters (a chip cleared, Back) before the paint.
  useResetWhen(`${filters.logName}|${filters.startDate}|${filters.endDate}`, () => {
    setLogName(filters.logName);
    setStartDate(fromApiDate(filters.startDate));
    setEndDate(fromApiDate(filters.endDate));
  });

  const activeCount =
    (filters.logName ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  const handleApply = () => {
    onApply({
      logName: logName.trim(),
      startDate: toApiDate(startDate),
      endDate: toApiDate(endDate),
    });
    setVisible(false);
  };

  const handleClear = () => {
    setLogName("");
    setStartDate(null);
    setEndDate(null);
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
        style={{ width: "min(24rem, 95vw)" }}
        pt={{ header: { className: "pb-2!" } }}
      >
        <div className="space-y-5 pt-1">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Log name
            </p>
            <InputText
              value={logName}
              onChange={(e) => setLogName(e.target.value)}
              placeholder="Filter by action"
              className="w-full text-sm"
            />
            <small className="text-(--text-muted)">
              Exact match: copy one from the Log column.
            </small>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                From
              </p>
              <Calendar
                value={startDate}
                onChange={(e) => setStartDate((e.value as Date) ?? null)}
                dateFormat="yy-mm-dd"
                showIcon
                className="w-full text-sm"
                maxDate={endDate ?? undefined}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                To
              </p>
              <Calendar
                value={endDate}
                onChange={(e) => setEndDate((e.value as Date) ?? null)}
                dateFormat="yy-mm-dd"
                showIcon
                className="w-full text-sm"
                minDate={startDate ?? undefined}
              />
            </div>
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
