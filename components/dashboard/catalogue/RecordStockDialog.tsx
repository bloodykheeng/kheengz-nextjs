"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import type { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field } from "@/components/dashboard/ui";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import type { ApiErrorBody } from "@/lib/validation";
import { getStockCard, recordStock } from "@/services/catalogue/catalogue-service";
import type { ManualStockReason } from "@/services/types/catalogue";

const REASONS: { label: string; value: ManualStockReason; hint: string }[] = [
  { label: "Received", value: "Received", hint: "New stock came in. It is added." },
  { label: "Counted", value: "Counted", hint: "What you counted on the shelf becomes the figure." },
  { label: "Damaged", value: "Damaged", hint: "Broken, expired or lost. It is taken off." },
  { label: "Returned", value: "Returned", hint: "A buyer brought it back in good shape. It is added." },
  { label: "Moved", value: "Moved", hint: "From one of your locations to another." },
];

/**
 * Record a stock change by hand (docs/stock.md): received, counted, damaged, returned or moved, for one
 * variant at one location. The API refuses what is not there; its words show here.
 */
export default function RecordStockDialog({ productId, visible, onHide, variantId, locationId }: {
  productId: string;
  visible: boolean;
  onHide: () => void;
  variantId?: string | null;
  locationId?: string | null;
}) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const card = useQuery({ queryKey: ["stock", productId], queryFn: () => getStockCard(productId), enabled: visible });
  const [reason, setReason] = useState<ManualStockReason>("Received");
  const [variant, setVariant] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counted = (card.data?.variants ?? []).filter((v) => v.track_stock);
  const locations = card.data?.locations ?? [];
  // Chosen, or the only one there is, or the shop's default location.
  const variantValue = variant ?? variantId ?? (counted.length === 1 ? counted[0].id : null);
  const locationValue = location ?? locationId ?? locations.find((l) => l.is_default)?.id ?? null;
  const chosen = counted.find((v) => v.id === variantValue);
  const here = chosen?.levels.find((l) => l.location_id === locationValue);

  useResetOnOpen(visible, `${variantId}:${locationId}`, () => {
    setReason("Received");
    setVariant(null);
    setLocation(null);
    setTo(null);
    setQuantity(null);
    setNote("");
    setError(null);
  });

  const save = useMutation({
    mutationFn: () => recordStock(productId, { variant_id: variantValue!, location_id: locationValue!, reason, quantity: quantity!, to_location_id: reason === "Moved" ? to : null, note: note.trim() || null }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      queryClient.setQueryData(["stock", productId], response.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-movements", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["shop-stock"] }),
      ]);
      toast.success(response.message);
      onHide();
    },
    onError: (e: AxiosError<ApiErrorBody>) => {
      const errors = e.response?.data?.errors;
      setError((errors && Object.values(errors)[0]?.[0]) || e.response?.data?.message || "That did not save. Try again.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!variantValue) return setError("Choose the variant.");
    if (!locationValue) return setError("Choose the location.");
    if (quantity === null || (reason !== "Counted" && quantity <= 0)) return setError(reason === "Counted" ? "Enter what you counted." : "Enter how many.");
    if (reason === "Moved" && !to) return setError("Choose where it is moving to.");
    save.mutate();
  };

  const unit = chosen?.unit;
  const hint = REASONS.find((r) => r.value === reason)?.hint;

  return (
    <Dialog header="Record stock" visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      {card.isPending ? (
        <div className="h-48 animate-pulse rounded-xl bg-(--border-color)/40" role="status" aria-label="Loading" />
      ) : counted.length === 0 ? (
        <p className="text-sm text-(--text-muted)">No variant of this product counts its stock. Switch on &quot;Count stock&quot; on a variant first.</p>
      ) : (
        <form className="space-y-4" noValidate onSubmit={submit}>
          <Field label="What happened" hint={hint}>
            <SelectButton value={reason} onChange={(e) => e.value && setReason(e.value)} options={REASONS.filter((r) => r.value !== "Moved" || locations.length > 1)} optionLabel="label" optionValue="value" className="flex flex-wrap" />
          </Field>
          {counted.length > 1 && (
            <Field label="Variant">
              <Dropdown value={variantValue} options={counted.map((v) => ({ label: v.label || "This product", value: v.id }))} onChange={(e) => setVariant(e.value)} className="w-full" />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.length > 1 && (
              <Field label={reason === "Moved" ? "From" : "Where"}>
                <Dropdown value={locationValue} options={locations.map((l) => ({ label: l.name, value: l.id }))} onChange={(e) => setLocation(e.value)} className="w-full" />
              </Field>
            )}
            {reason === "Moved" && (
              <Field label="To">
                <Dropdown value={to} options={locations.filter((l) => l.id !== locationValue).map((l) => ({ label: l.name, value: l.id }))} onChange={(e) => setTo(e.value)} placeholder="Choose" className="w-full" />
              </Field>
            )}
          </div>
          <Field label={reason === "Counted" ? "Counted on the shelf" : "How many"} hint={here ? `Now: ${here.on_hand} on hand, ${here.reserved} held for orders, ${here.available} free.` : undefined}>
            <InputNumber value={quantity} onValueChange={(e) => setQuantity(e.value ?? null)} min={0} maxFractionDigits={unit?.allows_decimals ? 3 : 0} suffix={unit ? ` ${unit.plural}` : undefined} className="w-full" inputClassName="w-full" aria-label="Quantity" autoFocus />
          </Field>
          <Field label="Note" hint="Optional: the supplier, the reason, who counted.">
            <InputText value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} className="w-full" />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
            <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
          </div>
        </form>
      )}
    </Dialog>
  );
}
