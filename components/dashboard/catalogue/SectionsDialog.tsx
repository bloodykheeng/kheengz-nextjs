"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { InputText } from "primereact/inputtext";
import type { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/dashboard/ui";
import { confirmAction, confirmSubmit } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { plural } from "@/lib/plural";
import type { ApiErrorBody } from "@/lib/validation";
import { createShopSection, deleteShopSection, getShopSections, reorderShopSections, updateShopSection } from "@/services/catalogue/catalogue-service";
import { LIMITS, type ShopSection } from "@/services/types/catalogue";
import { Bar } from "@/components/dashboard/RecordSkeleton";

const firstError = (e: AxiosError<ApiErrorBody>) => {
  const errors = e.response?.data?.errors;
  return (errors && Object.values(errors)[0]?.[0]) || e.response?.data?.message || "That did not save. Try again.";
};

/**
 * A shop's own sections (D32): "Back to school", "Under 10k". Add, rename, order (the shop's menu
 * order) and remove; removing one only takes its products out of it.
 */
export default function SectionsDialog({ shopId, visible, onHide }: { shopId: string; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const sections = useQuery({ queryKey: ["shop-sections", shopId], queryFn: () => getShopSections(shopId), enabled: visible });
  const list = sections.data ?? [];
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useResetOnOpen(visible, shopId, () => {
    setName("");
    setRenaming(null);
    setError(null);
  });

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["shop-sections", shopId] }), queryClient.invalidateQueries({ queryKey: ["products", shopId] })]);
  const add = useMutation({
    mutationFn: () => createShopSection(shopId, { name: name.trim() }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await refresh();
      setName("");
      toast.success(response.message);
    },
    onError: (e: AxiosError<ApiErrorBody>) => setError(firstError(e)),
  });
  const rename = useMutation({
    mutationFn: (r: { id: string; name: string }) => updateShopSection(shopId, r.id, { name: r.name.trim() }),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      await refresh();
      setRenaming(null);
    },
    onError: (e: AxiosError<ApiErrorBody>) => setError(firstError(e)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderShopSections(shopId, ids),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (s: ShopSection) => deleteShopSection(shopId, s.id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });

  const move = (i: number, by: -1 | 1) => {
    const ids = list.map((s) => s.id);
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <Dialog header="Shop sections" visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }}>
      <div className="space-y-4">
        <p className="text-sm text-(--text-secondary)">Your own groups for your shop&apos;s menu, named as you like. A product can be in several.</p>
        <form className="flex gap-2" noValidate onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (name.trim().length < 2) return setError("Name the section, like Back to school.");
          confirmSubmit("this section", () => add.mutateAsync());
        }}>
          <InputText value={name} onChange={(e) => setName(e.target.value)} placeholder="Back to school" aria-label="New section name" className="min-w-0 flex-1" disabled={list.length >= LIMITS.sections} />
          <Button type="submit" icon="pi pi-plus" label="Add" loading={add.isPending} disabled={list.length >= LIMITS.sections} />
        </form>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {sections.isPending ? (
          <ul className="space-y-3 rounded-xl border border-(--border-color) p-3" role="status" aria-label="Loading">{[0, 1, 2].map((i) => <li key={i} className="space-y-1.5"><Bar w="w-40" /><Bar w="w-20" h="h-3" /></li>)}</ul>
        ) : list.length === 0 ? (
          <EmptyState icon="pi-th-large" title="No sections yet" body="Add one above, like Wedding sets or Under 10k." />
        ) : (
          <ul className="divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
            {list.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                {renaming?.id === s.id ? (
                  <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); setError(null); confirmSubmit("the new name", () => rename.mutateAsync(renaming)); }}>
                    <InputText value={renaming.name} onChange={(e) => setRenaming({ id: s.id, name: e.target.value })} className="min-w-0 flex-1" aria-label={`New name for ${s.name}`} autoFocus />
                    <Button type="submit" size="small" icon="pi pi-check" aria-label="Save name" loading={rename.isPending} />
                    <Button type="button" size="small" text icon="pi pi-times" aria-label="Cancel" onClick={() => setRenaming(null)} />
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-(--text-primary)">{s.name}</span>
                      <span className="block text-xs text-(--text-muted)">{plural(s.products_count ?? 0, "product")}</span>
                    </span>
                    <Button type="button" text size="small" icon="pi pi-arrow-up" aria-label={`Move ${s.name} up`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} />
                    <Button type="button" text size="small" icon="pi pi-arrow-down" aria-label={`Move ${s.name} down`} disabled={i === list.length - 1 || reorder.isPending} onClick={() => move(i, 1)} />
                    <Button type="button" text size="small" icon="pi pi-pencil" aria-label={`Rename ${s.name}`} onClick={() => setRenaming({ id: s.id, name: s.name })} />
                    <Button type="button" text size="small" severity="danger" icon="pi pi-trash" aria-label={`Remove ${s.name}`}
                      onClick={() => confirmAction({ header: `Remove ${s.name}?`, message: "Its products stay in your shop; they only leave this section.", danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(s) })} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
