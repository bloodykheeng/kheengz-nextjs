"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable from "@/components/dashboard/tables/PrimeReactDataTable";
import { PageHeader } from "@/components/dashboard/ui";
import RecordStockDialog from "@/components/dashboard/catalogue/RecordStockDialog";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { usePermissions } from "@/hooks/usePermissions";
import type { ExportColumn } from "@/lib/exportRows";
import { getShopStock } from "@/services/catalogue/catalogue-service";
import { getShop } from "@/services/vendors/vendors-service";
import type { ShopStockRow } from "@/services/types/catalogue";

const CATALOGUE_CLOSED = new Set(["Rejected", "Closed"]);
const STATES = [{ label: "All", value: "" }, { label: "Running low", value: "low" }, { label: "None free", value: "out" }];

/**
 * A shop's stock at a glance (docs/stock.md): every counted variant with what is free, emptiest first,
 * narrowed to what is running low or gone. Record a delivery or a count from the row.
 */
export default function ShopStock() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const shop = useQuery({ queryKey: ["shop", id], queryFn: () => getShop(id) });
  useBreadcrumbTitle(shop.data?.name);
  const { page, pageSize, search, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const state = getParam("state");
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [recording, setRecording] = useState<ShopStockRow | null>(null);
  const editable = can("run shops") && !can("view vendors") && !!shop.data && !CATALOGUE_CLOSED.has(shop.data.status);

  const filters = { "filter[search]": search || undefined, "filter[state]": state || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["shop-stock", id, page, pageSize, search, state, sort],
    queryFn: () => getShopStock(id, { ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  const name = (r: ShopStockRow) => (r.label ? `${r.product_name}, ${r.label}` : r.product_name);
  const exportColumns: ExportColumn<ShopStockRow>[] = [
    { header: "Product", value: (r) => name(r) },
    { header: "SKU", value: (r) => r.sku ?? "" },
    { header: "Free", value: (r) => r.available },
    { header: "On hand", value: (r) => r.on_hand },
    { header: "Unit", value: (r) => r.unit.plural },
    { header: "Low at", value: (r) => r.low_stock_at ?? "" },
  ];

  const columns = [
    { field: "product", header: "Product", body: (r: ShopStockRow) => (
      <Link href={`/dashboard/products/${r.product_id}`} className="block hover:text-(--brand-ink)">
        <span className="block font-medium">{name(r)}</span>
        <span className="block text-xs text-(--text-muted)">{r.sku ? `SKU ${r.sku}` : ""}{r.is_active ? "" : " · not offered"}</span>
      </Link>
    ) },
    { field: "available", header: "Free", sortable: true, body: (r: ShopStockRow) => {
      const out = r.available <= 0;
      const low = !out && r.low_stock_at !== null && r.available <= r.low_stock_at;
      return (
        <span className={`text-sm font-semibold ${out ? "text-red-600" : low ? "text-amber-600" : ""}`}>
          {out ? "None" : `${r.available} ${r.available === 1 ? r.unit.name : r.unit.plural}`}
          {r.on_hand !== r.available && <span className="block text-xs font-normal text-(--text-muted)">{r.on_hand} on hand</span>}
        </span>
      );
    } },
    { field: "low_stock_at", header: "Tell me at", body: (r: ShopStockRow) => <span className="text-sm text-(--text-muted)">{r.low_stock_at ?? "Running out"}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={shop.data ? `${shop.data.name}: stock` : "Stock"}
        subtitle={<>What is free to sell, emptiest first. <Link href={`/dashboard/shops/${id}/products`} className="font-medium text-(--brand-ink) hover:underline">Products</Link></>}
      />
      <PrimeReactDataTable<ShopStockRow>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage={state === "low" ? "Nothing is running low." : state === "out" ? "Nothing has run out." : "No counted stock yet. Products count their stock unless you switch it off."}
        fileName={`${shop.data?.name ?? "Shop"} stock`}
        exportAll={{ fetchPage: (p: number, pp: number) => getShopStock(id, { ...filters, page: p, per_page: pp }), columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <SelectButton value={state ?? ""} onChange={(e) => setFilters({ state: e.value ?? "" })} options={STATES} allowEmpty={false} aria-label="Show" />
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Product, SKU or barcode" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={editable ? [{ key: "record", icon: <span className="pi pi-plus" aria-hidden />, tooltip: "Record stock", onClick: (r: ShopStockRow) => setRecording(r) }] : []}
      />
      {recording && <RecordStockDialog productId={recording.product_id} variantId={recording.id} visible={!!recording} onHide={() => setRecording(null)} />}
    </div>
  );
}
