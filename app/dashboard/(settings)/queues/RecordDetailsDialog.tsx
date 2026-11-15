"use client";

import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import type { QueueRecord } from "@/services/settings/jobs/jobs-service";

interface RecordDetailsDialogProps {
  visible: boolean;
  onHide: () => void;
  selectedRecord: QueueRecord | null;
  queueType: "jobs" | "failed";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </p>
      <p className="wrap-break-word text-sm text-(--text-primary)">{value ?? "-"}</p>
    </div>
  );
}

/** Pretty-prints the JSON payload; falls back to the raw string if it will not parse. */
function prettyJson(raw?: string | null): string {
  if (!raw) return "-";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const RecordDetailsDialog: React.FC<RecordDetailsDialogProps> = ({
  visible,
  onHide,
  selectedRecord,
  queueType,
}) => {

  // Nothing selected, nothing to show. This is an early return rather than
  // optional chaining on every field because JSX children are built eagerly:
  // `value={<span>{selectedRecord.id}</span>}` is evaluated while this
  // component renders, long before Dialog decides whether `visible` lets it
  // through. Without this the page throws on mount, not on click.
  if (!selectedRecord) return null;
  const a = selectedRecord ?? {};

  const fmtUnix = (unix?: number | null) =>
    unix ? new Date(unix * 1000).toLocaleString() : "-";
  const fmtIso = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

  return (
    <Dialog
      header={
        <div className="flex items-center gap-2">
          <span className="pi pi-info-circle text-lg text-(--brand-ink)" />
          <span>{queueType === "jobs" ? "Queued Job" : "Failed Job"} details</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: "min(56rem, 95vw)" }}
      modal
      maximizable
      footer={<Button label="Close" icon="pi pi-times" text onClick={onHide} />}
    >
      {!selectedRecord ? (
        <p className="p-4 text-sm text-(--text-muted)">No record selected.</p>
      ) : (
        <div className="space-y-5 p-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ID" value={<span className="font-mono">{selectedRecord.id}</span>} />
            <Field label="Queue" value={<span className="capitalize">{a.queue}</span>} />

            {queueType === "jobs" ? (
              <>
                <Field label="Attempts" value={a.attempts ?? 0} />
                <Field
                  label="Reserved at"
                  value={a.reserved_at ? fmtUnix(a.reserved_at) : "Pending"}
                />
                <Field label="Available at" value={fmtUnix(a.available_at)} />
                <Field label="Created at" value={fmtUnix(a.created_at)} />
              </>
            ) : (
              <>
                <Field
                  label="UUID"
                  value={<span className="font-mono text-xs">{a.uuid}</span>}
                />
                <Field label="Connection" value={a.connection} />
                <Field label="Failed at" value={fmtIso(a.failed_at)} />
              </>
            )}
          </div>

          {queueType === "failed" && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Exception
              </p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-(--border-color) bg-(--bg-page) p-3 text-xs text-red-600 dark:text-red-400">
                {a.exception || "-"}
              </pre>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Payload
            </p>
            <pre className="max-h-80 overflow-auto rounded-lg border border-(--border-color) bg-(--bg-page) p-3 text-xs text-(--text-secondary)">
              {prettyJson(a.payload)}
            </pre>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default RecordDetailsDialog;
