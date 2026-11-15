"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";

import PrimeReactDataTable, {
  viewAction,
  deleteSelectedAction,
} from "@/components/dashboard/tables/PrimeReactDataTable";
import InlineExpandableText from "@/components/dashboard/helpers/InlineExpandableText";
import { usePermissions } from "@/hooks/usePermissions";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { getAllActivityLogs } from "@/services/settings/activity-logs/activity-logs-service";
import type { ActivityLogFields } from "@/services/settings/activity-logs/activity-logs-service";

import type { ApiResource } from "@/services/types/api";
import DeleteRecordsDialog from "./DeleteRecordsDialog";
import RecordDetailsDialog from "./RecordDetailsDialog";
import FiltersButton from "./FiltersButton";
import {
  humanise,
  logSeverity,
  shortModel,
  formatDateTime,
  relativeTime,
  outcomeOf,
  fieldChanges,
  snapshotValues,
  bulkRecords,
  cascadeCounts,
  summariseChange,
  summariseValue,
} from "./helpers";
import { useResetWhen } from "@/hooks/useResetOnOpen";

type LogRow = ApiResource<ActivityLogFields>;

export default function RecordsList() {
  const {
    page,
    pageSize,
    search,
    sort,
    sortField,
    sortOrder,
    first,
    getParam,
    pushParams,
    setFilters,
  } = useListParams();

  const logName = getParam("logName");
  const startDate = getParam("startDate");
  const endDate = getParam("endDate");

  const [searchInput, setSearchInput] = useState(search);
  // Follows the URL (Back, a cleared chip) before the paint, not after it.
  useResetWhen(search, () => setSearchInput(search));

  const query = useQuery({
    queryKey: [
      "activity-logs",
      page,
      pageSize,
      search,
      logName,
      startDate,
      endDate,
      sort,
    ],
    queryFn: (ctx) =>
      getAllActivityLogs(
        {
          page,
          per_page: pageSize,
          "filter[search]": search || undefined,
          "filter[log_name]": logName || undefined,
          "filter[start_date]": startDate || undefined,
          "filter[end_date]": endDate || undefined,
          sort,
          include: "causer",
        },
        ctx
      ),
  });

  // Write actions are hidden without `manage settings`. The API gates the same routes with
  // `can:` middleware, so this only stops the UI offering a button that answers 403.
  const { can } = usePermissions();
  const canManage = can("manage settings");

  const paged = query.data?.data;
  const tableData: LogRow[] = paged?.data ?? [];
  const totalRecords: number = paged?.meta?.total ?? 0;
  const perPage: number = paged?.meta?.per_page ?? pageSize;

  const causerNameOf = (row?: LogRow) => (row)?.causer?.name ?? "-";

  const onPageChange = (e: DataTablePageEvent) =>
    pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows });

  // Third click clears the param, returning to the server's own order (-id).
  const onColumnSort = (e: DataTableSortEvent) =>
    pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE });

  const [selectedItems, setSelectedItems] = useState<LogRow[]>([]);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [viewRecord, setViewRecord] = useState<LogRow | null>(null);
  const [showView, setShowView] = useState(false);

  const columns = [
    {
      field: "log_name",
      header: "Module",
      sortable: true,
      body: (row: LogRow) => (
        <Tag
          value={humanise(row.log_name)}
          // Coloured by the event's verb (created / updated / deleted), not the
          // module, the module names a noun and carries no severity of its own.
          severity={logSeverity(row.event)}
          className="text-xs whitespace-nowrap"
        />
      ),
    },
    {
      field: "description",
      header: "Description",
      body: (row: LogRow) => (
        <InlineExpandableText
          text={row.description}
          maxLength={70}
          className="text-(--text-primary)"
        />
      ),
    },
    {
      field: "causer",
      header: "Performed by",
      body: (row: LogRow) => (
        <span className="whitespace-nowrap text-(--text-secondary)">
          {causerNameOf(row)}
        </span>
      ),
    },
    {
      field: "subject_type",
      header: "Affected record",
      visible: false,
      body: (row: LogRow) => (
        <span className="text-(--text-muted)">
          {shortModel(row.subject_type)}
        </span>
      ),
    },
    {
      field: "outcome",
      header: "Outcome",
      visible: false,
      body: (row: LogRow) => {
        const outcome = outcomeOf(row.properties);
        return (
          <Tag
            value={outcome === "failed" ? "Failed" : "Success"}
            severity={outcome === "failed" ? "danger" : "success"}
            className="text-xs"
          />
        );
      },
    },
    {
      // The same field diff the details dialog shows, flattened to one line. Hidden by
      // default, it is long, but available from the column picker for scanning a run of
      // edits without opening each one.
      field: "changes",
      header: "What changed",
      visible: false,
      body: (row: LogRow) => {
        const changes = fieldChanges(row.properties);
        const entries = Object.entries(changes);

        if (!entries.length) {
          return <span className="text-(--text-muted)">-</span>;
        }

        return (
          <InlineExpandableText
            text={entries.map(([, c]) => `${c.label}: ${summariseChange(c)}`).join("; ")}
            maxLength={60}
            className="text-(--text-secondary)"
          />
        );
      },
    },
    {
      field: "snapshot",
      header: "Recorded values",
      visible: false,
      body: (row: LogRow) => {
        const p = row.properties;
        const snapshot = snapshotValues(p);
        const bulk = bulkRecords(p);

        // A bulk delete has no single snapshot: name the records it removed instead.
        const text = Object.keys(snapshot).length
          ? Object.entries(snapshot)
              .map(([, f]) => `${f.label}: ${summariseValue(f)}`)
              .join("; ")
          : bulk.records
              .map((r) => Object.values(r).map(summariseValue).join(" · "))
              .join("; ");

        if (!text) return <span className="text-(--text-muted)">-</span>;

        return (
          <InlineExpandableText
            text={text}
            maxLength={60}
            className="text-(--text-secondary)"
          />
        );
      },
    },
    {
      field: "cascade",
      header: "Also destroyed",
      visible: false,
      body: (row: LogRow) => {
        const cascade = cascadeCounts(row.properties);
        const entries = Object.entries(cascade);

        if (!entries.length) return <span className="text-(--text-muted)">-</span>;

        return (
          <span className="whitespace-nowrap text-red-600 dark:text-red-400">
            {entries.map(([level, n]) => `${level}: ${n.toLocaleString()}`).join(", ")}
          </span>
        );
      },
    },
    {
      // Worked out from the IP when the entry was written (kheengz-laravel docs/visitor-origin.md):
      // empty when the address is private or unknown, never guessed.
      field: "where",
      header: "Where",
      body: (row: LogRow) => {
        const p = row.properties ?? {};
        const place = [p.city, p.region, p.country].filter((v): v is string => typeof v === "string" && v !== "").join(", ");
        return <span className="whitespace-nowrap text-xs text-(--text-secondary)">{place || "-"}</span>;
      },
    },
    {
      field: "ip",
      header: "IP",
      visible: false,
      body: (row: LogRow) => (
        <span className="font-mono text-xs text-(--text-muted)">
          {(row.properties?.ip as string) ?? "-"}
        </span>
      ),
    },
    {
      field: "event",
      header: "Event",
      sortable: true,
      visible: false,
      body: (row: LogRow) => (
        <span className="text-(--text-muted)">
          {row.event ? humanise(row.event) : "-"}
        </span>
      ),
    },
    {
      field: "created_at",
      header: "When",
      type: "date",
      sortable: true,
      body: (row: LogRow) => (
        <div className="whitespace-nowrap">
          <p className="text-(--text-primary)">
            {formatDateTime(row.created_at)}
          </p>
          <p className="text-xs text-(--text-muted)">
            {relativeTime(row.created_at)}
          </p>
        </div>
      ),
    },
  ];

  const activeChips = [
    logName && { key: "logName", label: humanise(logName) },
    startDate && { key: "startDate", label: `From ${startDate}` },
    endDate && { key: "endDate", label: `To ${endDate}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const headerContent = (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ search: searchInput.trim(), page: DEFAULT_PAGE });
        }}
        className="flex items-center"
      >
        <div className="relative">
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search descriptions…"
            className="w-56 rounded-r-none! border-r-0! pr-7 text-sm"
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
        filters={{ logName, startDate, endDate }}
        onApply={(f) =>
          setFilters({
            logName: f.logName,
            startDate: f.startDate,
            endDate: f.endDate,
          })
        }
        onClear={() => setFilters({ logName: "", startDate: "", endDate: "" })}
      />

      {(search || activeChips.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--rose) px-2.5 py-0.5 text-xs font-medium text-(--brand-dark) dark:bg-(--rose) dark:text-(--accent-mid)">
              &ldquo;{search}&rdquo;
              <button
                onClick={() => pushParams({ search: "", page: DEFAULT_PAGE })}
                className="pi pi-times text-[10px]"
              />
            </span>
          )}
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            >
              {chip.label}
              <button
                onClick={() => pushParams({ [chip.key]: "", page: DEFAULT_PAGE })}
                className="pi pi-times text-[10px]"
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (query.isError && !query.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 py-16 dark:border-red-900 dark:bg-red-950/20">
        <span className="pi pi-exclamation-circle text-4xl text-red-400" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Failed to load the audit trail. Please try again.
        </p>
        <Button
          label="Retry"
          icon="pi pi-refresh"
          severity="danger"
          text
          onClick={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <>
      <PrimeReactDataTable
        data={tableData}
        columns={columns}
        loading={query.isPending}
        emptyMessage="No activity recorded yet."
        fileName="Audit Trail Export"
        headerContent={headerContent}
        pagination={{ total: totalRecords, rows: perPage, first, onPageChange }}
        sort={{ field: sortField, order: sortOrder, onSort: onColumnSort }}
        selection={
          canManage ? { selected: selectedItems, onChange: setSelectedItems } : undefined
        }
        // Read-only by nature: an audit entry is never edited, only read or purged.
        rowActions={[
          viewAction<LogRow>((row) => {
            setViewRecord(row);
            setShowView(true);
          }),
        ]}
        toolbarActions={
          canManage ? [deleteSelectedAction<LogRow>(() => setDeleteVisible(true))] : []
        }
      />

      <DeleteRecordsDialog
        visible={deleteVisible}
        onHide={() => setDeleteVisible(false)}
        selectedItems={selectedItems}
        setSelectedItems={(items) => setSelectedItems(items as LogRow[])}
      />

      <RecordDetailsDialog
        visible={showView}
        onHide={() => {
          setShowView(false);
          setViewRecord(null);
        }}
        selectedRecord={viewRecord}
        causerName={causerNameOf(viewRecord ?? undefined)}
      />
    </>
  );
}
