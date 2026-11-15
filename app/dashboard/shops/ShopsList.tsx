"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { PageHeader, StatusTag } from "@/components/dashboard/ui";
import NewShopDialog from "@/components/dashboard/vendors/NewShopDialog";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppRouter } from "@/hooks/useAppRouter";
import { dateTime } from "@/lib/format";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { APP_NAME } from "@/lib/brand";
import { getShops, getVendors } from "@/services/vendors/vendors-service";
import { SHOP_STATUSES, SHOP_TYPES, type Shop } from "@/services/types/kheengz";

/**
 * Shops (D31). Reviewers see every shop, waiting ones first to hand; a vendor's people see the shops
 * they run. Filters, search and paging live in the URL (useListParams).
 */
export default function ShopsList() {
  const router = useAppRouter();
  const { can } = usePermissions();
  const reviewer = can("view vendors");
  const { page, pageSize, search, status, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const shopType = getParam("shop_type");
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [opening, setOpening] = useState(false);

  const filterGroups: FilterGroup[] = [
    { title: "Shop", fields: [
      { type: "select", key: "status", label: "Status", options: optionsOf(SHOP_STATUSES), placeholder: "Any status" },
      { type: "select", key: "shop_type", label: "Type", options: optionsOf(SHOP_TYPES), placeholder: "Any type" },
    ] },
  ];

  const filters = { "filter[search]": search || undefined, "filter[status]": status || undefined, "filter[shop_type]": shopType || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["shops", page, pageSize, search, status, shopType, sort],
    queryFn: () => getShops({ ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  // The vendor a new shop opens under: the first one this person owns.
  const mine = useQuery({ queryKey: ["vendors", "mine"], queryFn: () => getVendors({ per_page: 50 }), enabled: can("run shops") });
  const ownVendor = mine.data?.data.find((v) => v.my_role === "Owner" && v.status !== "Suspended" && v.status !== "Rejected");

  const exportColumns: ExportColumn<Shop>[] = [
    { header: "Shop", value: (s) => s.name },
    { header: "Address", value: (s) => s.address },
    { header: "Vendor", value: (s) => s.vendor?.name ?? "" },
    { header: "Type", value: (s) => s.shop_type },
    { header: "Status", value: (s) => s.status },
    { header: "Phone", value: (s) => s.phone },
    { header: "Opened", value: (s) => asDate(s.approved_at) },
    { header: "Created", value: (s) => asDate(s.created_at) },
  ];

  const columns = [
    {
      field: "name",
      header: "Shop",
      sortable: true,
      body: (s: Shop) => (
        <Link href={`/dashboard/shops/${s.id}`} className="block hover:text-(--brand-ink)">
          <span className="block font-medium">{s.name}</span>
          <span className="block text-xs text-(--text-muted)">{s.address}</span>
        </Link>
      ),
    },
    ...(reviewer ? [{ field: "vendor", header: "Vendor", body: (s: Shop) => <span className="text-sm">{s.vendor?.name}</span> }] : []),
    { field: "shop_type", header: "Type", body: (s: Shop) => <span className="text-sm">{s.shop_type}</span> },
    { field: "status", header: "Status", sortable: true, body: (s: Shop) => <StatusTag status={s.status} raw /> },
    { field: "created_at", header: "Created", sortable: true, body: (s: Shop) => <span className="text-xs text-(--text-muted)">{dateTime(s.created_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={reviewer ? "Shops" : "My shops"}
        subtitle={reviewer ? "Every shop on the marketplace. Open one to review it." : "Each shop is reviewed on its own before it opens."}
        actions={ownVendor ? <Button icon="pi pi-plus" label="Open a shop" onClick={() => setOpening(true)} /> : undefined}
      />
      <PrimeReactDataTable<Shop>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage={reviewer ? "No shops match." : "No shops yet. Open your first one."}
        fileName={`${APP_NAME} shops`}
        exportAll={{ fetchPage: (p: number, pp: number) => getShops({ ...filters, page: p, per_page: pp }), columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Shop name or web address" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[viewAction<Shop>((s) => router.push(`/dashboard/shops/${s.id}`))]}
      />
      {ownVendor && <NewShopDialog vendor={ownVendor} visible={opening} onHide={() => setOpening(false)} />}
    </div>
  );
}
