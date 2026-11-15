"use client";

import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { bulkDestroyActivityLogs, type ActivityLogFields } from "@/services/settings/activity-logs/activity-logs-service";
import type { ApiResource } from "@/services/types/api";

interface DeleteRecordsDialogProps {
  visible: boolean;
  onHide: () => void;
  selectedItems: ApiResource<ActivityLogFields>[];
  setSelectedItems: (items: ApiResource<ActivityLogFields>[]) => void;
}

const DeleteRecordsDialog: React.FC<DeleteRecordsDialogProps> = ({
  visible,
  onHide,
  selectedItems,
  setSelectedItems,
}) => {
  const queryClient = useQueryClient();
  const toast = usePrimeReactToast();

  const deleteMutation = useMutation({
    mutationFn: () => bulkDestroyActivityLogs(selectedItems.map((item) => item.id)),
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["activity-logs"] });
      toast.success(
        "Deleted",
        `${selectedItems.length} log entr${selectedItems.length === 1 ? "y" : "ies"} removed.`
      );
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
          Delete {count} log entr{count === 1 ? "y" : "ies"}?
        </p>
        <p className="text-sm text-(--text-muted)">
          Audit records are evidence of who changed what. Deleting them is permanent and
          is itself recorded in this log.
        </p>
        {isPending && (
          <ProgressSpinner style={{ width: "36px", height: "36px" }} strokeWidth="4" />
        )}
      </div>
    </Dialog>
  );
};

export default DeleteRecordsDialog;
