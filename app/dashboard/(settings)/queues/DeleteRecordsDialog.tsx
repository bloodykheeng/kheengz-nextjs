"use client";

import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import {
  bulkDestroyJobs,
  bulkDestroyFailedJobs,
} from "@/services/settings/jobs/jobs-service";
import type { QueueRecord } from "@/services/settings/jobs/jobs-service";
import { plural } from "@/lib/plural";

interface DeleteRecordsDialogProps {
  visible: boolean;
  onHide: () => void;
  selectedItems: QueueRecord[];
  setSelectedItems: (items: QueueRecord[]) => void;
  queueType: "jobs" | "failed";
}

const DeleteRecordsDialog: React.FC<DeleteRecordsDialogProps> = ({
  visible,
  onHide,
  selectedItems,
  setSelectedItems,
  queueType,
}) => {
  const queryClient = useQueryClient();
  const toast = usePrimeReactToast();

  const label = queueType === "jobs" ? "queued job" : "failed job";

  const deleteMutation = useMutation({
    mutationFn: () => {
      const ids = selectedItems.map((item) => item.id);
      return queueType === "jobs" ? bulkDestroyJobs(ids) : bulkDestroyFailedJobs(ids);
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["queues"] });
      toast.success("Deleted", `${plural(selectedItems.length, label)} removed.`);
      setSelectedItems([]);
      onHide();
    },
  });

  const count = selectedItems.length;
  const isPending = deleteMutation.isPending;

  return (
    <Dialog maximizable
      header="Confirm deletion"
      visible={visible}
      style={{ width: "min(30rem, 95vw)" }}
      modal
      onHide={onHide}
      closeOnEscape={!isPending}
      closable={!isPending}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            label="Cancel"
            icon="pi pi-times"
            text
            onClick={onHide}
            disabled={isPending}
          />
          <Button
            label={isPending ? "Deleting…" : "Delete"}
            icon={isPending ? "pi pi-spin pi-spinner" : "pi pi-trash"}
            severity="danger"
            onClick={() => deleteMutation.mutate()}
            disabled={isPending}
          />
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
        <span className="pi pi-exclamation-triangle text-4xl text-amber-500" />
        <p className="text-sm font-semibold text-(--text-primary)">
          Delete {count} {label}
          {count !== 1 ? "s" : ""}?
        </p>
        <p className="text-sm text-(--text-muted)">
          {queueType === "jobs"
            ? "Deleting a queued job cancels it, the work it represents will never run."
            : "This only clears the failure record. It does not retry the job."}
        </p>
        {isPending && (
          <ProgressSpinner style={{ width: "36px", height: "36px" }} strokeWidth="4" />
        )}
      </div>
    </Dialog>
  );
};

export default DeleteRecordsDialog;
