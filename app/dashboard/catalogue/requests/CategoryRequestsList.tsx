"use client";

import React, { useState } from "react";
import type { AxiosError } from "axios";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { Field, PageHeader, StatusTag } from "@/components/dashboard/ui";
import CategoryPicker from "@/components/dashboard/catalogue/CategoryPicker";
import { CATEGORY_ICONS } from "@/components/dashboard/catalogue/CategoryDialog";
import { ReasonDialog } from "@/components/dashboard/vendors/PayoutDestinationsCard";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetOnOpen, useResetWhen } from "@/hooks/useResetOnOpen";
import { APP_NAME } from "@/lib/brand";
import { dateTime } from "@/lib/format";
import type { ApiErrorBody } from "@/lib/validation";
import { addRequestedCategory, declineCategoryRequest, getCategories, getCategoryRequests } from "@/services/catalogue/catalogue-service";
import { CATEGORY_REQUEST_STATUSES, LIMITS, type CategoryRequest } from "@/services/types/catalogue";
import { confirmSubmit } from "@/components/dashboard/ConfirmAction";

/**
 * Shops asking for a category the tree lacks (D32), newest first; filter to Pending to work the queue. Answer
 * each with a new category, one that already fits, or a reason. Whoever asked is told either way.
 */
export default function CategoryRequestsList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { page, pageSize, search, status, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [adding, setAdding] = useState<CategoryRequest | null>(null);
  const [declining, setDeclining] = useState<CategoryRequest | null>(null);
  const [viewing, setViewing] = useState<CategoryRequest | null>(null);
  // No hidden default filter (coding notes): every request shows, newest first; Pending is a chip away.
  const shownStatus = status || undefined;

  const filterGroups: FilterGroup[] = [
    { title: "Request", fields: [{ type: "select", key: "status", label: "Status", options: optionsOf(CATEGORY_REQUEST_STATUSES), placeholder: "Any status" }] },
  ];
  const filters = { "filter[search]": search || undefined, "filter[status]": shownStatus, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["category-requests", page, pageSize, search, shownStatus, sort],
    queryFn: () => getCategoryRequests({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  const decline = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => declineCategoryRequest(id, answer),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["category-requests"] });
      toast.success(response.message);
    },
  });

  const columns = [
    { field: "name", header: "Asked for", sortable: true, body: (r: CategoryRequest) => (
      <span>
        <span className="block font-medium">{r.name}</span>
        <span className="block text-xs text-(--text-muted)">{r.parent ? `Inside ${r.parent.path}` : "No place suggested"}</span>
        {r.note && <span className="block text-xs text-(--text-secondary)">“{r.note}”</span>}
      </span>
    ) },
    { field: "shop", header: "Shop", body: (r: CategoryRequest) => <span className="text-sm">{r.shop?.name}<span className="block text-xs text-(--text-muted)">{r.created_by?.name}</span></span> },
    { field: "status", header: "Status", sortable: true, body: (r: CategoryRequest) => (
      <span>
        <StatusTag status={r.status} raw />
        {r.category && <span className="block text-xs text-(--text-muted)">{r.category.path}</span>}
        {r.status === "Declined" && r.answer && <span className="block text-xs text-(--text-muted)">{r.answer}</span>}
      </span>
    ) },
    { field: "created_at", header: "Asked", sortable: true, body: (r: CategoryRequest) => <span className="text-xs text-(--text-muted)">{dateTime(r.created_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Category requests" subtitle="Shops ask here when the tree has no place for what they sell. Answer the same day if you can." />
      <PrimeReactDataTable<CategoryRequest>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage={shownStatus === "Pending" ? "Nothing waiting. Every request is answered." : search || shownStatus ? "No requests match." : "No shop has asked for a category yet."}
        fileName={`${APP_NAME} category requests`}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name asked for" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[
          viewAction<CategoryRequest>((r) => setViewing(r)),
          { key: "add", icon: <span className="pi pi-check" aria-hidden />, tooltip: "Add it", severity: "success", hidden: (r) => r.status !== "Pending", onClick: (r) => setAdding(r) },
          { key: "decline", icon: <span className="pi pi-times" aria-hidden />, tooltip: "Decline", severity: "danger", hidden: (r) => r.status !== "Pending", onClick: (r) => setDeclining(r) },
        ]}
      />
      <RecordDetailsDialog
        header={viewing ? `"${viewing.name}"` : ""}
        visible={!!viewing}
        onHide={() => setViewing(null)}
        record={viewing}
        fields={viewing ? [
          { label: "Asked for", value: viewing.name },
          { label: "Status", value: <StatusTag status={viewing.status} raw /> },
          { label: "Shop", value: viewing.shop?.name },
          { label: "Asked by", value: viewing.created_by?.name },
          { label: "Where it belongs", value: viewing.parent?.path ?? "Not said", wide: true },
          { label: "What they sell", value: viewing.note || "Not said", wide: true },
          { label: "Answered with", value: viewing.category?.path ?? (viewing.status === "Pending" ? "Not yet" : "No category"), wide: true },
          { label: "Note to the shop", value: viewing.answer || "None", wide: true },
          { label: "Decided", value: viewing.decided_at ? `${dateTime(viewing.decided_at)}${viewing.decided_by ? ` by ${viewing.decided_by.name}` : ""}` : "Not yet" },
        ] : []}
        footer={viewing && (
          <div className="flex justify-end gap-2">
            <Button label="Close" text onClick={() => setViewing(null)} />
            {viewing.status === "Pending" && <Button label="Decline" icon="pi pi-times" outlined severity="danger" onClick={() => { setDeclining(viewing); setViewing(null); }} />}
            {viewing.status === "Pending" && <Button label="Add it" icon="pi pi-check" onClick={() => { setAdding(viewing); setViewing(null); }} />}
          </div>
        )}
      />
      <AddCategoryDialog request={adding} onHide={() => setAdding(null)} />
      <ReasonDialog
        visible={!!declining}
        header={declining ? `Decline "${declining.name}"?` : ""}
        prompt="The shop reads this. Say why, and which category to use instead."
        acceptLabel="Decline"
        onHide={() => setDeclining(null)}
        onSubmit={(answer) => decline.mutateAsync({ id: declining!.id, answer })}
      />
    </div>
  );
}

/** Answer a request: make the category (name, place, icon), or point to one that already fits. */
function AddCategoryDialog({ request, onHide }: { request: CategoryRequest | null; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const visible = !!request;
  const tree = useQuery({ queryKey: ["categories"], queryFn: () => getCategories(), enabled: visible });
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  useResetOnOpen(visible, request?.id ?? "", () => {
    setMode("new");
    setName(request?.name ?? "");
    setParentId(request?.parent_id ?? null);
    setIcon(null);
    setExistingId(null);
    setAnswer("");
    setError(null);
  });
  const save = useMutation({
    mutationFn: () => addRequestedCategory(request!.id, mode === "existing"
      ? { category_id: existingId, answer: answer || null }
      : { name, parent_id: parentId, icon, answer: answer || null }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["category-requests"] }), queryClient.invalidateQueries({ queryKey: ["categories"] })]);
      toast.success(response.message);
      onHide();
    },
    onError: (e: AxiosError<ApiErrorBody>) => {
      const errors = e.response?.data?.errors;
      setError((errors && Object.values(errors)[0]?.[0]) || e.response?.data?.message || "That did not work. Try again.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "existing" && !existingId) return setError("Choose the category that fits.");
    if (mode === "new" && name.trim().length < 2) return setError("Enter the category's name.");
    confirmSubmit(mode === "existing" ? "this answer" : "this category", () => save.mutateAsync());
  };

  const categories = tree.data ?? [];

  return (
    <Dialog header={request ? `Add "${request.name}"` : ""} visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={submit}>
        <SelectButton value={mode} onChange={(e) => e.value && setMode(e.value)} options={[{ label: "Make it", value: "new" }, { label: "One already fits", value: "existing" }]} />
        {mode === "new" ? (
          <>
            <Field label="Name" required>
              <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
            </Field>
            <Field label="Inside" hint={request?.parent ? `The shop suggested ${request.parent.path}.` : "Leave empty for a top category."}>
              <CategoryPicker categories={categories} value={parentId} onChange={setParentId} placeholder="At the top" showClear disabled={(c) => c.depth >= LIMITS.categoryDepth} />
            </Field>
            {!parentId && (
              <Field label="Icon">
                <Dropdown value={icon} options={CATEGORY_ICONS} onChange={(e) => setIcon(e.value ?? null)} placeholder="No icon" showClear className="w-full" />
              </Field>
            )}
          </>
        ) : (
          <Field label="The category that fits" required>
            <CategoryPicker categories={categories.filter((c) => c.is_active)} value={existingId} onChange={setExistingId} />
          </Field>
        )}
        <Field label="Note to the shop" hint="Optional. Sent with the news.">
          <InputText value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full" maxLength={500} />
        </Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Add and tell the shop" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
