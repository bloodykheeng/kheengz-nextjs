"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Chips } from "primereact/chips";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { editAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { Field, PageHeader } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetOnOpen, useResetWhen } from "@/hooks/useResetOnOpen";
import { APP_NAME } from "@/lib/brand";
import { ALWAYS, applyServerErrors, requiredText } from "@/lib/validation";
import { createProductAttribute, deleteProductAttribute, getProductAttributes, updateProductAttribute } from "@/services/catalogue/catalogue-service";
import { ATTRIBUTE_INPUT_TYPES, type ProductAttribute } from "@/services/types/catalogue";

/**
 * Attributes (D32): what buyers filter products by. Defined once here, then given to categories on the
 * Categories page. A choice or a type that products already use stays (the API refuses to pull it).
 */
export default function AttributesList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { page, pageSize, search, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const inputType = getParam("input_type");
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [editing, setEditing] = useState<{ attribute: ProductAttribute | null } | null>(null);

  const filterGroups: FilterGroup[] = [
    { title: "Attribute", fields: [{ type: "select", key: "input_type", label: "Filled in as", options: optionsOf(ATTRIBUTE_INPUT_TYPES), placeholder: "Any" }] },
  ];
  const filters = { "filter[search]": search || undefined, "filter[input_type]": inputType || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["product-attributes", page, pageSize, search, inputType, sort],
    queryFn: () => getProductAttributes({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: (a: ProductAttribute) => deleteProductAttribute(a.id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["product-attributes"] });
      toast.success(response.message);
    },
  });

  const columns = [
    { field: "name", header: "Attribute", sortable: true, body: (a: ProductAttribute) => (
      <span>
        <span className="block font-medium">{a.name}</span>
        {a.hint && <span className="block text-xs text-(--text-muted)">{a.hint}</span>}
      </span>
    ) },
    { field: "input_type", header: "Filled in as", body: (a: ProductAttribute) => <span className="text-sm">{a.input_type}{a.unit ? ` (${a.unit})` : ""}</span> },
    { field: "options", header: "Choices", body: (a: ProductAttribute) => (
      <span className="text-sm text-(--text-secondary)">{a.input_type === "List" ? (a.options ?? []).map((o) => o.value).join(", ") : "Typed in"}</span>
    ) },
    { field: "categories_count", header: "Categories", body: (a: ProductAttribute) => <span className="text-sm">{a.categories_count ?? 0}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attributes"
        subtitle="What buyers filter by, like Colour, Capacity or Gauge. Give them to categories on the Categories page."
        actions={<Button icon="pi pi-plus" label="Add attribute" onClick={() => setEditing({ attribute: null })} />}
      />
      <PrimeReactDataTable<ProductAttribute>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage="No attributes match."
        fileName={`${APP_NAME} attributes`}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Attribute name" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[
          editAction<ProductAttribute>((a) => setEditing({ attribute: a })),
          { key: "delete", icon: <span className="pi pi-trash" aria-hidden />, tooltip: "Delete", severity: "danger", onClick: (a: ProductAttribute) => confirmAction({
            header: `Delete ${a.name}?`,
            message: (a.categories_count ?? 0) > 0 ? `It comes off ${a.categories_count} categor${a.categories_count === 1 ? "y" : "ies"}. If products are described by it, it stays.` : "This cannot be undone.",
            danger: true,
            acceptLabel: "Delete",
            accept: () => remove.mutateAsync(a),
          }) },
        ]}
      />
      <AttributeDialog visible={!!editing} attribute={editing?.attribute ?? null} onHide={() => setEditing(null)} />
    </div>
  );
}

const schema = z.object({
  name: requiredText("Enter the attribute's name, like Colour.", 2).max(60),
  input_type: z.enum(["List", "Number", "Text"]),
  unit: z.string().max(20),
  hint: z.string().max(160),
  options: z.array(z.string().trim().min(1).max(60)),
}).superRefine((v, ctx) => {
  if (v.input_type === "List" && v.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Add the choices people pick from." });
  const seen = new Set<string>();
  for (const o of v.options) {
    if (seen.has(o.toLowerCase())) ctx.addIssue({ code: "custom", path: ["options"], message: `"${o}" is listed twice.` });
    seen.add(o.toLowerCase());
  }
}, ALWAYS);
type Values = z.infer<typeof schema>;

/** Name, how it is filled in, its unit, a hint for vendors, and (for a List) its choices in order. */
function AttributeDialog({ visible, attribute, onHide }: { visible: boolean; attribute: ProductAttribute | null; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const type = useWatch({ control, name: "input_type" });

  useResetOnOpen(visible, attribute?.id ?? "new", () => setFormError(null));
  useEffect(() => {
    if (visible) reset({ name: attribute?.name ?? "", input_type: attribute?.input_type ?? "List", unit: attribute?.unit ?? "", hint: attribute?.hint ?? "", options: (attribute?.options ?? []).map((o) => o.value) });
  }, [visible, attribute, reset]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      // Kept choices go back with their ids, so a rename stays the same choice for products.
      const ids = new Map((attribute?.options ?? []).map((o) => [o.value.toLowerCase(), o.id]));
      const payload = {
        name: v.name,
        input_type: v.input_type,
        unit: v.input_type === "Number" ? v.unit || null : null,
        hint: v.hint || null,
        options: v.input_type === "List" ? v.options.map((value) => ({ id: ids.get(value.toLowerCase()) ?? null, value })) : [],
      };
      return attribute ? updateProductAttribute(attribute.id, payload) : createProductAttribute(payload);
    },
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["product-attributes"] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "input_type", "unit", "hint", "options"])),
  });

  return (
    <Dialog header={attribute ? `Edit ${attribute.name}` : "Add an attribute"} visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <Field label="Name" required error={errors.name?.message}>
          <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" placeholder="Colour" invalid={!!errors.name} />} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Filled in as" required error={errors.input_type?.message} hint={type === "List" ? "A choice from the list." : type === "Number" ? "A number in its unit." : "Short text."}>
            <Controller control={control} name="input_type" render={({ field }) => <Dropdown value={field.value} options={ATTRIBUTE_INPUT_TYPES} onChange={(e) => field.onChange(e.value)} className="w-full" />} />
          </Field>
          {type === "Number" && (
            <Field label="Unit" error={errors.unit?.message} hint="Like L, cm, kg or m.">
              <Controller control={control} name="unit" render={({ field }) => <InputText {...field} className="w-full" placeholder="L" />} />
            </Field>
          )}
        </div>
        {type === "List" && (
          <Field label="Choices" required error={errors.options?.message} hint="Type one and press Enter. Renaming a choice keeps the products that use it.">
            <Controller control={control} name="options" render={({ field }) => (
              <Chips value={field.value} onChange={(e) => field.onChange((e.value ?? []).map((v: string) => v.trim()).filter(Boolean))} separator="," className="w-full" pt={{ container: { className: "w-full" } }} invalid={!!errors.options} />
            )} />
          </Field>
        )}
        <Field label="Hint for vendors" error={errors.hint?.message} hint="Shown under the field on the product form. Optional.">
          <Controller control={control} name="hint" render={({ field }) => <InputText {...field} className="w-full" placeholder="How much it holds, in litres." />} />
        </Field>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
