"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { fetchAllPaginated } from "@/lib/fetchAllPaginated";
import { getCategory, getProductAttributes, setCategoryAttributes } from "@/services/catalogue/catalogue-service";
import type { Category, ProductAttribute } from "@/services/types/catalogue";
import type { Paginated } from "@/services/types/kheengz";

type Row = { id: string; name: string; input_type: string; unit: string | null; is_required: boolean };

/**
 * What a category's products are described by (D32, D36). Its parents' attributes are shown, not
 * edited here (they come down to it); its own are chosen, ordered and marked required. Required ones
 * must be filled before a product in it goes on sale.
 */
export default function CategoryAttributesDialog({ category, onHide }: { category: Category | null; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const visible = !!category;
  const detail = useQuery({ queryKey: ["category", category?.id], queryFn: () => getCategory(category!.id), enabled: visible });
  const all = useQuery({
    queryKey: ["product-attributes", "all"],
    queryFn: () => fetchAllPaginated<ProductAttribute>((page, per_page) => getProductAttributes({ page, per_page }), (r) => {
      const p = r as Paginated<ProductAttribute>;
      return { rows: p.data, lastPage: p.meta.last_page };
    }),
    enabled: visible,
  });

  const own: Row[] = (detail.data?.attributes ?? []).map((a) => ({ id: a.id, name: a.name, input_type: a.input_type, unit: a.unit, is_required: !!a.is_required }));
  const [rows, setRows] = useState<Row[]>(own);
  const [picked, setPicked] = useState<string | null>(null);
  // Fresh from the server each time it opens (an edit left unsaved is dropped).
  useResetWhen(`${visible}:${detail.data?.id}:${detail.dataUpdatedAt}`, () => setRows(own));

  const inherited = (detail.data?.effective_attributes ?? []).filter((a) => a.from_category_id !== category?.id);
  const taken = new Set([...rows.map((r) => r.id), ...inherited.map((a) => a.id)]);
  const choices = (all.data ?? []).filter((a) => !taken.has(a.id));

  const save = useMutation({
    mutationFn: () => setCategoryAttributes(category!.id, rows.map((r) => ({ id: r.id, is_required: r.is_required }))),
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["category", category?.id] }), queryClient.invalidateQueries({ queryKey: ["categories"] })]);
      toast.success(response.message);
      onHide();
    },
  });

  const move = (i: number, by: -1 | 1) => setRows((r) => {
    const next = [...r];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    return next;
  });

  const add = (id: string | null) => {
    const a = (all.data ?? []).find((x) => x.id === id);
    if (a) setRows((r) => [...r, { id: a.id, name: a.name, input_type: a.input_type, unit: a.unit, is_required: false }]);
    setPicked(null);
  };

  return (
    <Dialog header={category ? `Attributes of ${category.name}` : ""} visible={visible} onHide={onHide} style={{ width: "min(36rem, 95vw)" }} closable={!save.isPending}>
      {detail.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-(--border-color)/40" role="status" aria-label="Loading" />
      ) : (
        <div className="space-y-5">
          {inherited.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">From the categories above</h3>
              <ul className="flex flex-wrap gap-2">
                {inherited.map((a) => (
                  <li key={a.id} className="rounded-lg bg-(--bg-page) px-2.5 py-1 text-sm text-(--text-secondary)">
                    {a.name}{a.is_required ? " · required" : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--text-muted)">Its own</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-(--text-muted)">None yet. Add what buyers filter {category?.name} by, like Capacity or Gauge.</p>
            ) : (
              <ul className="divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
                {rows.map((r, i) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-(--text-primary)">{r.name}</span>
                      <span className="block text-xs text-(--text-muted)">{r.input_type}{r.unit ? ` in ${r.unit}` : ""}</span>
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={r.is_required} onChange={(e) => setRows((all) => all.map((x) => (x.id === r.id ? { ...x, is_required: !!e.checked } : x)))} />
                      Required
                    </label>
                    <span className="flex">
                      <Button type="button" text size="small" icon="pi pi-arrow-up" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)} />
                      <Button type="button" text size="small" icon="pi pi-arrow-down" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} />
                      <Button type="button" text size="small" severity="danger" icon="pi pi-times" aria-label={`Remove ${r.name}`} onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Dropdown
              value={picked}
              options={choices}
              optionLabel="name"
              optionValue="id"
              onChange={(e) => add(e.value)}
              placeholder={all.isPending ? "Loading attributes…" : "Add an attribute"}
              filter
              className="mt-3 w-full"
              emptyMessage="Every attribute is already here. Make a new one on the Attributes page."
            />
          </section>
          <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
            <Button type="button" icon="pi pi-check" label="Save" loading={save.isPending} onClick={() => save.mutate()} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
