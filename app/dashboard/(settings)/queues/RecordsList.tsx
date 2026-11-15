"use client";

import React, { useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useQuery } from "@tanstack/react-query";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";

import PrimeReactDataTable, {
  viewAction,
  deleteSelectedAction,
} from "@/components/dashboard/tables/PrimeReactDataTable";
import InlineExpandableText from "@/components/dashboard/helpers/InlineExpandableText";
import { usePermissions } from "@/hooks/usePermissions";
import { getAllJobs, getAllFailedJobs } from "@/services/settings/jobs/jobs-service";
import type { QueueRecord } from "@/services/settings/jobs/jobs-service";
import type { Paginated } from "@/services/types/kheengz";
import DeleteRecordsDialog from "./DeleteRecordsDialog";
import RecordDetailsDialog from "./RecordDetailsDialog";
import FiltersButton from "./FiltersButton";
import { useResetWhen } from "@/hooks/useResetOnOpen";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 5;

/** `jobs.created_at`/`available_at`/`reserved_at` are unix ints, not ISO strings. */
const fmtUnix = (unix?: number | null) =>
  unix ? new Date(unix * 1000).toLocaleString() : "-";

const fmtIso = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

// `sortable` fields must match JobController::allowedSorts, or the request 400s.
const jobColumns = [
  {
    field: "id",
    header: "#",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="font-mono text-xs">{r.id}</span>
    ),
  },
  {
    field: "queue",
    header: "Queue",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="capitalize">{r?.queue || "-"}</span>
    ),
  },
  {
    field: "payload",
    header: "Payload",
    body: (r: QueueRecord) => (
      <InlineExpandableText text={r?.payload || "{}"} maxLength={60} />
    ),
  },
  {
    field: "attempts",
    header: "Attempts",
    sortable: true,
    body: (r: QueueRecord) => <span>{r?.attempts ?? 0}</span>,
  },
  {
    field: "reserved_at",
    header: "Reserved at",
    body: (r: QueueRecord) => (
      <span className="text-xs">
        {r?.reserved_at ? fmtUnix(r.reserved_at) : "Pending"}
      </span>
    ),
    exportValue: (r: QueueRecord) => (r?.reserved_at ? fmtUnix(r.reserved_at) : "Pending"),
  },
  {
    field: "available_at",
    header: "Available at",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="text-xs">{fmtUnix(r?.available_at)}</span>
    ),
    exportValue: (r: QueueRecord) => fmtUnix(r?.available_at),
  },
  {
    field: "created_at",
    header: "Created at",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="text-xs">{fmtUnix(r?.created_at)}</span>
    ),
    exportValue: (r: QueueRecord) => fmtUnix(r?.created_at),
  },
];

const failedColumns = [
  {
    field: "id",
    header: "#",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="font-mono text-xs">{r.id}</span>
    ),
  },
  {
    field: "uuid",
    header: "UUID",
    body: (r: QueueRecord) => (
      <InlineExpandableText text={r?.uuid || "-"} maxLength={20} />
    ),
  },
  {
    field: "connection",
    header: "Connection",
    body: (r: QueueRecord) => <span>{r?.connection || "-"}</span>,
  },
  {
    field: "queue",
    header: "Queue",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="capitalize">{r?.queue || "-"}</span>
    ),
  },
  {
    field: "exception",
    header: "Exception",
    body: (r: QueueRecord) => (
      <span className="text-xs text-red-500 dark:text-red-400">
        <InlineExpandableText text={r?.exception || "-"} maxLength={80} />
      </span>
    ),
  },
  {
    field: "failed_at",
    header: "Failed at",
    sortable: true,
    body: (r: QueueRecord) => (
      <span className="text-xs">{fmtIso(r?.failed_at)}</span>
    ),
  },
];

export default function RecordsList({ queueType }: { queueType: "jobs" | "failed" }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useAppRouter();

  const page = Number(searchParams.get("page")) || DEFAULT_PAGE;
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;
  const appliedSearch = searchParams.get("search") ?? "";
  const queue = searchParams.get("queue") ?? "";
  const sort = searchParams.get("sort") ?? "";

  const pushParams = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      const s = String(v);
      if (s) params.set(k, s);
      else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const [searchInput, setSearchInput] = useState(appliedSearch);
  // Follows the URL (Back, a cleared chip) before the paint, not after it.
  useResetWhen(appliedSearch, () => setSearchInput(appliedSearch));

  const [selectedItems, setSelectedItems] = useState<QueueRecord[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<QueueRecord | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const query = useQuery({
    queryKey: ["queues", queueType, page, pageSize, appliedSearch, queue, sort],
    queryFn: async (ctx): Promise<Paginated<QueueRecord>> => {
      const params = {
        page,
        per_page: pageSize,
        "filter[search]": appliedSearch || undefined,
        "filter[queue]": queue || undefined,
        sort,
      };
      if (queueType === "jobs") return (await getAllJobs(params, ctx)).data;
      return (await getAllFailedJobs(params, ctx)).data;
    },
  });

  // Write actions are hidden without `manage queue`. The API gates the same routes with
  // `can:` middleware, so this only stops the UI offering a button that answers 403.
  const { can } = usePermissions();
  const canManage = can("manage queue");

  const paged = query.data;
  const tableData: QueueRecord[] = paged?.data ?? [];
  const totalRecords: number = paged?.meta?.total ?? 0;
  const perPage: number = paged?.meta?.per_page ?? pageSize;
  const first = (page - 1) * pageSize;

  const onPageChange = (e: DataTablePageEvent) =>
    pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows });

  // 3-state column sort to `sort` param (asc to desc to back to the API default).
  const onColumnSort = (e: DataTableSortEvent) => {
    const next =
      !e.sortField || !e.sortOrder
        ? ""
        : e.sortOrder === -1
          ? `-${e.sortField}`
          : String(e.sortField);
    pushParams({ sort: next, page: DEFAULT_PAGE });
  };

  const ptSortField = sort ? sort.replace(/^-/, "") : undefined;
  const ptSortOrder: 1 | -1 = sort.startsWith("-") ? -1 : 1;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({ search: searchInput.trim(), page: DEFAULT_PAGE });
  };

  const headerContent = (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={onSearchSubmit} className="flex items-center">
        <div className="relative">
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${queueType === "jobs" ? "jobs" : "failed jobs"}…`}
            className="w-52 rounded-r-none! border-r-0! pr-7 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                pushParams({ search: "", page: DEFAULT_PAGE });
              }}
              className="pi pi-times absolute right-2 top-1/2 -translate-y-1/2 text-xs text-(--text-muted) hover:text-(--text-primary)"
            />
          )}
        </div>
        <Button
          type="submit"
          icon="pi pi-search"
          severity="secondary"
          outlined
          className="rounded-l-none!"
        />
      </form>

      <FiltersButton
        filters={{ queueName: queue }}
        onApply={(f) => pushParams({ queue: f.queueName, page: DEFAULT_PAGE })}
        onClear={() => pushParams({ queue: "", page: DEFAULT_PAGE })}
      />

      {queue && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          {queue}
          <button
            onClick={() => pushParams({ queue: "", page: DEFAULT_PAGE })}
            className="pi pi-times text-[10px]"
          />
        </span>
      )}
    </div>
  );

  return (
    <>
      <PrimeReactDataTable
        data={tableData}
        columns={queueType === "jobs" ? jobColumns : failedColumns}
        loading={query.isPending}
        emptyMessage={
          queueType === "jobs" ? "No queued jobs found." : "No failed jobs found."
        }
        fileName={`${queueType}-export`}
        headerContent={headerContent}
        pagination={{ total: totalRecords, rows: perPage, first, onPageChange }}
        sort={{ field: ptSortField, order: ptSortOrder, onSort: onColumnSort }}
        selection={
          canManage ? { selected: selectedItems, onChange: setSelectedItems } : undefined
        }
        // A queued job is inspected or purged, never edited.
        rowActions={[
          viewAction<QueueRecord>((r) => {
            setDetailRecord(r);
            setDetailVisible(true);
          }),
        ]}
        toolbarActions={
          canManage
            ? [deleteSelectedAction<QueueRecord>(() => setDeleteVisible(true))]
            : []
        }
      />

      <DeleteRecordsDialog
        visible={deleteVisible}
        onHide={() => setDeleteVisible(false)}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        queueType={queueType}
      />

      <RecordDetailsDialog
        visible={detailVisible}
        onHide={() => {
          setDetailVisible(false);
          setDetailRecord(null);
        }}
        selectedRecord={detailRecord}
        queueType={queueType}
      />
    </>
  );
}
