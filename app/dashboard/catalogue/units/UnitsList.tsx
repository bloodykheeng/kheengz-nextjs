"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { InputText } from "primereact/inputtext";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { Field, PageHeader, StatusTag, SwitchRow } from "@/components/dashboard/ui";
import { confirmAction, confirmSubmit, guardedClose } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetOnOpen, useResetWhen } from "@/hooks/useResetOnOpen";
import { useTicked } from "@/hooks/useTicked";
import { APP_NAME } from "@/lib/brand";
import { applyServerErrors, requiredText } from "@/lib/validation";
import { createUnit, deleteUnits, getUnitsPage, updateUnit } from "@/services/catalogue/catalogue-service";
import type { Unit } from "@/services/types/catalogue";

/**
 * Units of sale (D17): piece, dozen, kg, metre. Each shop type offers its own first on the product
 * form. A unit products are sold by is turned off, not deleted, and keeps whether it takes decimals.
 * The standard table: paged, searched, View on every row, ticked rows deleted together.
 */
export default function UnitsList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { page, pageSize, search, sort, sortField, sortOrder, first, pushParams, setFilters } = useListParams();
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [editing, setEditing] = useState<{ unit: Unit | null } | null>(null);
  const [viewing, setViewing] = useState<Unit | null>(null);

  const filters = { "filter[search]": search || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["units", "page", page, pageSize, search, sort],
    queryFn: () => getUnitsPage({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });
  const rows = query.data?.data ?? [];
  const [ticked, setTicked] = useTicked(rows, `${page}:${pageSize}:${search}:${sort}`);

  const remove = useMutation({
    mutationFn: (units: Unit[]) => deleteUnits(units.map((u) => u.id)),
    onSuccess: async (response) => {
      setTicked([]);
      await queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(response.message);
    },
  });

  const columns = [
    { field: "name", header: "Unit", sortable: true, body: (u: Unit) => <span>{u.name} <span className="text-(--text-muted)">/ {u.plural}</span></span> },
    { field: "allows_decimals", header: "Quantities", body: (u: Unit) => <span className="text-sm">{u.allows_decimals ? "Takes decimals" : "Whole numbers"}</span> },
    { field: "is_active", header: "Status", body: (u: Unit) => <StatusTag status={u.is_active ? "Active" : "Inactive"} raw /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Units" subtitle="How things are sold. Weighed and measured units take decimals (1.5 kg); counted ones do not." />
      <PrimeReactDataTable<Unit>
        data={rows}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage={search ? "No units match." : "No units yet. Add piece first: most things are sold by the piece."}
        fileName={`${APP_NAME} units`}
        headerContent={
          <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
            <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Unit name" className="w-56 rounded-r-none! text-sm" />
            <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
          </form>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[viewAction<Unit>((u) => setViewing(u)), editAction<Unit>((u) => setEditing({ unit: u }))]}
        selection={{ selected: ticked, onChange: setTicked }}
        toolbarActions={[
          deleteSelectedAction<Unit>(() => confirmAction({
            header: ticked.length === 1 ? `Delete ${ticked[0].name}?` : `Delete ${ticked.length} units?`,
            message: "This cannot be undone. If products are sold by any of them, none are deleted: turn those off instead.",
            danger: true,
            acceptLabel: "Delete",
            accept: () => remove.mutateAsync(ticked),
          })),
          createAction<Unit>(() => setEditing({ unit: null })),
        ]}
      />
      <RecordDetailsDialog
        header={viewing ? `${viewing.name} / ${viewing.plural}` : ""}
        visible={!!viewing}
        onHide={() => setViewing(null)}
        record={viewing}
        people={false}
        fields={viewing ? [
          { label: "One", value: viewing.name },
          { label: "More than one", value: viewing.plural },
          { label: "Quantities", value: viewing.allows_decimals ? "Takes decimals (1.5)" : "Whole numbers" },
          { label: "Status", value: <StatusTag status={viewing.is_active ? "Active" : "Inactive"} raw /> },
        ] : []}
        footer={viewing && <div className="flex justify-end gap-2"><Button label="Close" text onClick={() => setViewing(null)} /><Button label="Edit" icon="pi pi-pencil" outlined onClick={() => { setEditing({ unit: viewing }); setViewing(null); }} /></div>}
      />
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
  const { control, handleSubmit, reset, setError, formState: { errors , isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", plural: "", allows_decimals: false, is_active: true } });

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

  const close = guardedClose(isDirty, save.isPending, onHide);

  return (
    <Dialog header={unit ? `Edit ${unit.name}` : "Add a unit"} visible={visible} onHide={close} style={{ width: "min(28rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); confirmSubmit("this unit", () => save.mutateAsync(v)); })}>
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
          <Button type="button" text label="Cancel" onClick={close} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
