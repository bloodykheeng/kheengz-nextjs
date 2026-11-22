"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, Field, PageHeader, SwitchRow } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { applyServerErrors, requiredText } from "@/lib/validation";
import { createUnit, deleteUnit, getUnits, updateUnit } from "@/services/catalogue/catalogue-service";
import type { Unit } from "@/services/types/catalogue";

/**
 * Units of sale (D17): piece, dozen, kg, metre. Each shop type offers its own first on the product
 * form. A unit products are sold by is turned off, not deleted, and keeps whether it takes decimals.
 * A short list, so not paged.
 */
export default function UnitsList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", "all"], queryFn: () => getUnits() });
  const [editing, setEditing] = useState<{ unit: Unit | null } | null>(null);

  const remove = useMutation({
    mutationFn: (u: Unit) => deleteUnit(u.id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(response.message);
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Units"
        subtitle="How things are sold. Weighed and measured units take decimals (1.5 kg); counted ones do not."
        actions={<Button icon="pi pi-plus" label="Add unit" onClick={() => setEditing({ unit: null })} />}
      />
      <Card padded={false}>
        {units.isPending ? (
          <div className="space-y-2 p-5" role="status" aria-label="Loading">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-(--border-color)/50" />)}
          </div>
        ) : (units.data ?? []).length === 0 ? (
          <div className="p-5"><EmptyState icon="pi-box" title="No units yet" body="Add piece first: most things are sold by the piece." /></div>
        ) : (
          <ul className="divide-y divide-(--border-color)">
            {(units.data ?? []).map((u) => (
              <li key={u.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${u.is_active ? "" : "opacity-60"}`}>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-(--text-primary)">{u.name} <span className="font-normal text-(--text-muted)">/ {u.plural}</span></span>
                  <span className="block text-xs text-(--text-muted)">{u.allows_decimals ? "Takes decimals" : "Whole numbers"}{u.is_active ? "" : " · off"}</span>
                </span>
                <span className="flex gap-1">
                  <Button text size="small" icon="pi pi-pencil" aria-label={`Edit ${u.name}`} onClick={() => setEditing({ unit: u })} />
                  <Button text size="small" severity="danger" icon="pi pi-trash" aria-label={`Delete ${u.name}`}
                    onClick={() => confirmAction({ header: `Delete ${u.name}?`, message: "If products are sold by it, it stays: turn it off instead.", danger: true, acceptLabel: "Delete", accept: () => remove.mutateAsync(u) })} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <UnitDialog visible={!!editing} unit={editing?.unit ?? null} onHide={() => setEditing(null)} />
    </div>
  );
}

const schema = z.object({
  name: requiredText("Enter the unit, like piece or kg.", 1).max(30),
  plural: requiredText("Enter it for more than one, like pieces.", 1).max(30),
  allows_decimals: z.boolean(),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function UnitDialog({ visible, unit, onHide }: { visible: boolean; unit: Unit | null; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useResetOnOpen(visible, unit?.id ?? "new", () => setFormError(null));
  useEffect(() => {
    if (visible) reset({ name: unit?.name ?? "", plural: unit?.plural ?? "", allows_decimals: unit?.allows_decimals ?? false, is_active: unit?.is_active ?? true });
  }, [visible, unit, reset]);

  const save = useMutation({
    mutationFn: (v: Values) => (unit ? updateUnit(unit.id, v) : createUnit(v)),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "plural", "allows_decimals", "is_active"])),
  });

  return (
    <Dialog header={unit ? `Edit ${unit.name}` : "Add a unit"} visible={visible} onHide={onHide} style={{ width: "min(28rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="One" required error={errors.name?.message}>
            <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" placeholder="bale" invalid={!!errors.name} />} />
          </Field>
          <Field label="More than one" required error={errors.plural?.message}>
            <Controller control={control} name="plural" render={({ field }) => <InputText {...field} className="w-full" placeholder="bales" invalid={!!errors.plural} />} />
          </Field>
        </div>
        <Controller control={control} name="allows_decimals" render={({ field }) => (
          <SwitchRow label="Takes decimals" hint="For weighed or measured things: 1.5 kg, 2.5 metres." checked={field.value} onChange={field.onChange} />
        )} />
        <Controller control={control} name="is_active" render={({ field }) => (
          <SwitchRow label="On" hint="Off: vendors can no longer choose it. Products sold by it keep it." checked={field.value} onChange={field.onChange} />
        )} />
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
