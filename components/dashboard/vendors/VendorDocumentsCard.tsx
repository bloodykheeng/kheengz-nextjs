"use client";

import React, { useRef } from "react";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { dateTime } from "@/lib/format";
import {
  checkVendorDocument,
  deleteVendorDocument,
  openVendorDocument,
  uploadVendorDocument,
} from "@/services/vendors/vendors-service";
import type { Vendor, VendorDocumentType } from "@/services/types/kheengz";

const ALL_TYPES: VendorDocumentType[] = ["National ID (front)", "National ID (back)", "Business registration", "Other"];
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * A vendor's papers (D35). The Owner uploads each type (a new one replaces the last) and may remove one
 * until the vendor is approved; a reviewer opens each privately and marks it checked. Files are never
 * linked publicly: each is fetched with the signed-in token and shown as a short-lived blob.
 */
export default function VendorDocumentsCard({ vendor, mode }: { vendor: Vendor; mode: "owner" | "reviewer" | "member" }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const pendingType = useRef<VendorDocumentType | null>(null);
  const documents = vendor.documents ?? [];
  const missing = vendor.missing_documents ?? [];
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] }), queryClient.invalidateQueries({ queryKey: ["vendors"] })]);

  const upload = useMutation({
    mutationFn: ({ type, file }: { type: VendorDocumentType; file: File }) => uploadVendorDocument(vendor.id, type, file),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorDocument(id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const check = useMutation({
    mutationFn: (id: string) => checkVendorDocument(id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const open = useMutation({
    mutationFn: (id: string) => openVendorDocument(id),
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener");
      // Long enough for the new tab to read it; then the file leaves memory.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });

  const pick = (type: VendorDocumentType) => {
    pendingType.current = type;
    input.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const type = pendingType.current;
    if (!file || !type) return;
    if (file.size > MAX_BYTES) {
      toast.error("The file is over 10 MB. Take the photo again at a smaller size, or scan to PDF.");
      return;
    }
    upload.mutate({ type, file });
  };

  const canRemove = mode === "owner" && vendor.status !== "Approved";

  return (
    <Card title="Papers" actions={missing.length > 0 ? <Tag severity="warning" value={`${missing.length} missing`} /> : <Tag severity="success" value="Complete" />}>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={onFile} aria-hidden tabIndex={-1} />
      {missing.length > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Still needed: {missing.join(", ")}. {mode === "owner" ? "A clear phone photo of each is enough." : ""}
        </p>
      )}
      <ul className="divide-y divide-(--border-color)">
        {ALL_TYPES.filter((t) => t !== "Business registration" || vendor.kind === "Company" || documents.some((d) => d.type === t)).map((type) => {
          const doc = documents.find((d) => d.type === type);
          return (
            <li key={type} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-(--text-primary)">{type}</p>
                <p className="truncate text-xs text-(--text-muted)">
                  {doc ? `${doc.original_name} · added ${dateTime(doc.created_at)}${doc.checked_at ? ` · checked ${dateTime(doc.checked_at)}` : ""}` : "Not added"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc && (
                  <Button size="small" outlined icon="pi pi-eye" label="Open" loading={open.isPending && open.variables === doc.id} onClick={() => open.mutate(doc.id)} />
                )}
                {doc && mode === "reviewer" && !doc.checked_at && (
                  <Button size="small" outlined severity="success" icon="pi pi-check" label="Mark checked" loading={check.isPending && check.variables === doc.id} onClick={() => check.mutate(doc.id)} />
                )}
                {mode === "owner" && (
                  <Button
                    size="small"
                    icon="pi pi-upload"
                    label={doc ? "Replace" : "Upload"}
                    outlined={!!doc}
                    loading={upload.isPending && upload.variables?.type === type}
                    disabled={upload.isPending}
                    onClick={() => pick(type)}
                  />
                )}
                {doc && canRemove && (
                  <Button
                    size="small"
                    text
                    severity="danger"
                    icon="pi pi-trash"
                    aria-label={`Remove ${type}`}
                    onClick={() => confirmAction({ header: `Remove ${type}?`, message: "You can upload it again any time before approval.", danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(doc.id) })}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
