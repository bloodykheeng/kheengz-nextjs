"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useQuery } from "@tanstack/react-query";
import { useAppRouter } from "@/hooks/useAppRouter";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { PageHeader, StatusTag } from "@/components/dashboard/ui";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { dateTime } from "@/lib/format";
import { ugandanLocal } from "@/lib/phone";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { APP_NAME } from "@/lib/brand";
import { getVendors } from "@/services/vendors/vendors-service";
import { VENDOR_STATUSES, type Vendor } from "@/services/types/kheengz";

/** Every vendor, for reviewers (D35): filter to Pending to work through applications. */
export default function VendorsList() {
  const router = useAppRouter();
  const { page, pageSize, search, status, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const kind = getParam("kind");
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));

  const filterGroups: FilterGroup[] = [
    { title: "Vendor", fields: [
      { type: "select", key: "status", label: "Status", options: optionsOf(VENDOR_STATUSES), placeholder: "Any status" },
      { type: "select", key: "kind", label: "Sells as", options: optionsOf(["Individual", "Company"]), placeholder: "Either" },
    ] },
  ];

  const filters = { "filter[search]": search || undefined, "filter[status]": status || undefined, "filter[kind]": kind || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["vendors", page, pageSize, search, status, kind, sort],
    queryFn: () => getVendors({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  const exportColumns: ExportColumn<Vendor>[] = [
    { header: "Vendor", value: (v) => v.name },
    { header: "Sells as", value: (v) => v.kind },
    { header: "NIN", value: (v) => v.national_id_number },
    { header: "URSB number", value: (v) => v.registration_number ?? "" },
    { header: "Phone", value: (v) => v.phone },
    { header: "Email", value: (v) => v.email ?? "" },
    { header: "Status", value: (v) => v.status },
    { header: "Shops", value: (v) => v.shops_count ?? 0 },
    { header: "Approved", value: (v) => asDate(v.approved_at) },
    { header: "Applied", value: (v) => asDate(v.created_at) },
  ];

  const columns = [
    {
      field: "name",
      header: "Vendor",
      sortable: true,
      body: (v: Vendor) => (
        <span>
          <span className="block font-medium">{v.name}</span>
          <span className="block text-xs text-(--text-muted)">{v.kind === "Company" ? "Company" : "Individual"} · {ugandanLocal(v.phone)}</span>
        </span>
      ),
    },
    { field: "shops_count", header: "Shops", body: (v: Vendor) => v.shops_count ?? 0 },
    { field: "status", header: "Status", sortable: true, body: (v: Vendor) => <StatusTag status={v.status} raw /> },
    { field: "created_at", header: "Applied", sortable: true, body: (v: Vendor) => <span className="text-xs text-(--text-muted)">{dateTime(v.created_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Vendors" subtitle="The people and businesses behind the shops. Each is checked once; each of their shops is reviewed on its own." />
      <PrimeReactDataTable<Vendor>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage="No vendors match."
        fileName={`${APP_NAME} vendors`}
        exportAll={{ fetchPage: (p: number, pp: number) => getVendors({ ...filters, page: p, per_page: pp }), columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, phone, email or NIN" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[viewAction<Vendor>((v) => router.push(`/dashboard/vendors/${v.id}`))]}
      />
    </div>
  );
}
