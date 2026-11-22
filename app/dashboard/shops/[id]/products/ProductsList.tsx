"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { optionsOf } from "@/components/dashboard/filters/pickers";
import { PageHeader, StatusTag } from "@/components/dashboard/ui";
import SectionsDialog from "@/components/dashboard/catalogue/SectionsDialog";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { useResetWhen } from "@/hooks/useResetOnOpen";
import { useAppRouter } from "@/hooks/useAppRouter";
import { usePermissions } from "@/hooks/usePermissions";
import { dateTime, ugx } from "@/lib/format";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { isStoredPhoto } from "@/lib/storedPhoto";
import { getProducts, getShopSections } from "@/services/catalogue/catalogue-service";
import { getShop } from "@/services/vendors/vendors-service";
import { PRODUCT_STATUSES, type Product } from "@/services/types/catalogue";

const CATALOGUE_CLOSED = new Set(["Rejected", "Closed"]);

const priceRange = (p: Product) =>
  p.min_price == null ? "No price" : p.min_price === p.max_price ? ugx(p.min_price) : `${ugx(p.min_price)} to ${ugx(p.max_price)}`;

/**
 * One shop's products (D32). The shop's people add and edit them; reviewers look. Filters, search and
 * paging live in the URL. Sections, the shop's own groups, are managed from here.
 */
export default function ProductsList() {
  const { id } = useParams<{ id: string }>();
  const router = useAppRouter();
  const { can } = usePermissions();
  const shop = useQuery({ queryKey: ["shop", id], queryFn: () => getShop(id) });
  const sections = useQuery({ queryKey: ["shop-sections", id], queryFn: () => getShopSections(id) });
  useBreadcrumbTitle(shop.data?.name);
  const { page, pageSize, search, status, sort, sortField, sortOrder, first, getParam, pushParams, setFilters } = useListParams();
  const sectionId = getParam("section_id");
  const [searchInput, setSearchInput] = useState(search);
  useResetWhen(search, () => setSearchInput(search));
  const [managing, setManaging] = useState(false);

  const editable = can("run shops") && !!shop.data && !CATALOGUE_CLOSED.has(shop.data.status) && !can("view vendors");
  const filterGroups: FilterGroup[] = [
    { title: "Product", fields: [
      { type: "select", key: "status", label: "Status", options: optionsOf(PRODUCT_STATUSES), placeholder: "Any status" },
      { type: "select", key: "section_id", label: "Section", options: (sections.data ?? []).map((s) => ({ label: s.name, value: s.id })), placeholder: "Any section" },
    ] },
  ];
  const filters = { "filter[search]": search || undefined, "filter[status]": status || undefined, "filter[section_id]": sectionId || undefined, sort: sort || undefined };
  const query = useQuery({
    queryKey: ["products", id, page, pageSize, search, status, sectionId, sort],
    queryFn: () => getProducts(id, { ...filters, page, per_page: pageSize }),
    placeholderData: (previous) => previous,
  });

  const exportColumns: ExportColumn<Product>[] = [
    { header: "Product", value: (p) => p.name },
    { header: "Category", value: (p) => p.category?.path ?? "" },
    { header: "Status", value: (p) => (p.blocked_at ? "Taken down" : p.status) },
    { header: "Price", value: (p) => priceRange(p) },
    { header: "Variants", value: (p) => p.variants_count ?? 0 },
    { header: "Free to sell", value: (p) => ((p.tracked_variants_count ?? 0) === 0 ? "Not counted" : (p.stock_available ?? 0)) },
    { header: "Photos", value: (p) => p.photos_count ?? 0 },
    { header: "Updated", value: (p) => asDate(p.updated_at ?? null) },
  ];

  const columns = [
    {
      field: "name",
      header: "Product",
      sortable: true,
      body: (p: Product) => (
        <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-3 hover:text-(--brand-ink)">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-(--border-color) bg-white">
            {p.cover ? <Image src={p.cover.thumb_url} alt="" fill sizes="48px" className="object-contain" unoptimized={!isStoredPhoto(p.cover.thumb_url)} />
              : <span className="pi pi-image absolute inset-0 m-auto h-fit w-fit text-(--text-muted)" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{p.name}</span>
            <span className="block truncate text-xs text-(--text-muted)">{p.category?.path}</span>
          </span>
        </Link>
      ),
    },
    { field: "price", header: "Price", body: (p: Product) => <span className="text-sm">{priceRange(p)}<span className="block text-xs text-(--text-muted)">{p.variants_count} variant{p.variants_count === 1 ? "" : "s"}</span></span> },
    { field: "stock", header: "Stock", body: (p: Product) => (
      (p.tracked_variants_count ?? 0) === 0
        ? <span className="text-xs text-(--text-muted)">Not counted</span>
        : <span className={`text-sm ${(p.stock_available ?? 0) <= 0 ? "font-semibold text-red-600" : ""}`}>{(p.stock_available ?? 0) <= 0 ? "None free" : `${p.stock_available} free`}</span>
    ) },
    { field: "status", header: "Status", sortable: true, body: (p: Product) => <StatusTag status={p.blocked_at ? "Taken down" : p.status} raw /> },
    { field: "updated_at", header: "Updated", sortable: true, body: (p: Product) => <span className="text-xs text-(--text-muted)">{dateTime(p.updated_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={shop.data ? `${shop.data.name}: products` : "Products"}
        subtitle={<>Each is a draft until you put it on sale. <Link href={`/dashboard/shops/${id}`} className="font-medium text-(--brand-ink) hover:underline">Back to the shop</Link></>}
        actions={editable ? (
          <>
            <Button outlined icon="pi pi-chart-bar" label="Stock" onClick={() => router.push(`/dashboard/shops/${id}/stock`)} />
            <Button outlined icon="pi pi-th-large" label="Sections" onClick={() => setManaging(true)} />
            <Button icon="pi pi-plus" label="Add product" onClick={() => router.push(`/dashboard/shops/${id}/products/new`)} />
          </>
        ) : undefined}
      />
      <PrimeReactDataTable<Product>
        data={query.data?.data ?? []}
        columns={columns}
        loading={query.isPending || query.isPlaceholderData}
        emptyMessage={search || status || sectionId ? "No products match." : "No products yet. Add your first one."}
        fileName={`${shop.data?.name ?? "Shop"} products`}
        exportAll={{ fetchPage: (p: number, pp: number) => getProducts(id, { ...filters, page: p, per_page: pp }), columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setFilters({ search: searchInput.trim() }); }} className="flex">
              <InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, SKU or barcode" className="w-56 rounded-r-none! text-sm" />
              <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
            </form>
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
          </div>
        }
        pagination={{ total: query.data?.meta.total ?? 0, rows: pageSize, first, onPageChange: (e: DataTablePageEvent) => pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }) }}
        sort={{ field: sortField, order: sortOrder, onSort: (e: DataTableSortEvent) => pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }) }}
        rowActions={[viewAction<Product>((p) => router.push(`/dashboard/products/${p.id}`))]}
      />
      {editable && <SectionsDialog shopId={id} visible={managing} onHide={() => setManaging(false)} />}
    </div>
  );
}
