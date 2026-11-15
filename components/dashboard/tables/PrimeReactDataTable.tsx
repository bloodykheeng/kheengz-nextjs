"use client";
import React, { useState, useRef, useMemo, useId } from "react";
import {
  DataTable,
  DataTablePageEvent,
  DataTableSortEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { MenuItem } from "primereact/menuitem";
import { Checkbox } from "primereact/checkbox";
import { Tooltip } from "primereact/tooltip";
import * as XLSX from "xlsx";
import ExportDialog, { type ExportPageFetcher } from "@/components/dashboard/export/ExportDialog";
import type { ExportColumn } from "@/lib/exportRows";
import {
  FiTrash2,
  FiDownload,
  FiSettings,
  FiPlus,
  FiRotateCcw,
} from "react-icons/fi";
import { LuPencilLine, LuScanEye } from "react-icons/lu";

/** Any record a table shows: each screen passes its own row type (`PrimeReactDataTable<User>`). */
type DataItem = object;

/** The value at a dotted column path (`created_by.name`), or undefined where a step is missing. */
function valueAt(item: object, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown> | null | undefined)?.[part], item);
}

type Severity =
  "success" | "info" | "warning" | "danger" | "secondary" | "help";

// Columns

type ColumnConfig<T> = {
  /**
   * The column's identity, doing four jobs: the React key, the value PrimeReact
   * reads when there is no `body`, the sort key sent to the API unless
   * `sortField` overrides it, and the dot-path the Excel export walks unless
   * `exportValue` does. Must be unique within one table.
   */
  field: string;
  /** Column heading, and the header cell in the exported score card. */
  header: string;
  /** A help overlay beside the heading, for a column whose values need a sentence (a status). */
  headerHint?: React.ReactNode;
  /** `"date"` makes the export write a locale date rather than the raw ISO string. */
  type?: "date" | "image" | string;
  /** Renders the cell. Returns JSX, so the export cannot reuse it: see `exportValue`. */
  body?: (rowData: T) => React.ReactNode;
  /** `false` hides the column initially. The user can still switch it on. */
  visible?: boolean;
  /** Shows the 3-state sort arrows. Ignored unless the table is given `sort`. */
  sortable?: boolean;
  /** The key sent to the API when sorting this column. Defaults to `field`. */
  sortField?: string;
  /**
   * The cell's value for the export, when walking `field` cannot produce it:
   * a `body` that joins two fields, formats a status, or reads a timestamp
   * `type: "date"` cannot parse. Without it those cells export blank or raw.
   */
  exportValue?: (rowData: T) => string | number | null | undefined;
};

// Actions, declared by the screen rather than enumerated here: a `show*` /
// `handle*` / `hideRow*` trio per action meant this file had to know that one
// screen archives records and another re-sends an email. Two arrays replaced
// fifteen props, and adding an action is a list entry.

export type RowAction<T> = {
  /** Stable identity, also the React key. */
  key: string;
  icon: React.ReactNode;
  tooltip: string;
  severity?: Severity;
  onClick: (row: T) => void;
  /** Hides the button for particular rows, e.g. one the viewer may not edit. */
  hidden?: (row: T) => boolean;
  /** Renders something other than the standard round button. Wins over the rest. */
  render?: (row: T) => React.ReactNode;
};

export type ToolbarAction<T> = {
  key: string;
  /** A function when the label depends on the selection, e.g. "Delete (3)". */
  label?: string | ((selected: T[]) => string);
  icon?: React.ReactNode;
  /**
   * What it does, for an action with an icon and no label. Required in practice
   * for those: an unlabelled button is a guess.
   */
  tooltip?: string;
  severity?: Severity;
  /** Renders only once rows are ticked. Used by everything that acts on a selection. */
  requiresSelection?: boolean;
  onClick: (selected: T[]) => void;
};

/**
 * The pencil, wired to whatever the screen does with a row.
 *
 * On `info`, which the theme paints in the camp's gold: view and edit sit side
 * by side on every row, so they read as brand and accent rather than as a
 * traffic light. Red stays for delete alone.
 */
export const editAction = <T,>(
  onClick: (row: T) => void,
  options: Partial<Omit<RowAction<T>, "onClick">> = {},
): RowAction<T> => ({
  key: "edit",
  icon: <LuPencilLine />,
  tooltip: "Edit",
  severity: "info",
  onClick,
  ...options,
});

/** The eye. */
export const viewAction = <T,>(
  onClick: (row: T) => void,
  options: Partial<Omit<RowAction<T>, "onClick">> = {},
): RowAction<T> => ({
  key: "view",
  icon: <LuScanEye />,
  tooltip: "View details",
  // No severity: the primary, which is the emerald.
  severity: undefined,
  onClick,
  ...options,
});

/** The "New" button. Takes no row, so its handler ignores the selection. */
export const createAction = <T,>(
  onClick: () => void,
  label = "New",
): ToolbarAction<T> => ({
  key: "create",
  label,
  icon: <FiPlus className="text-sm" />,
  onClick,
});

/** Bulk delete. Appears only once something is ticked, and counts it in the label. */
export const deleteSelectedAction = <T,>(
  onClick: () => void,
): ToolbarAction<T> => ({
  key: "delete",
  label: (selected) => `Delete (${selected.length})`,
  icon: <FiTrash2 className="text-sm" />,
  severity: "danger",
  requiresSelection: true,
  onClick,
});

// Table

type PrimeReactDataTableProps<T extends DataItem> = {
  // Data
  /** The current page of rows. The table is `lazy`: it never slices or sorts. */
  data: T[];
  columns: ColumnConfig<T>[];
  /** A new set of rows is loading: pass `query.isPending || query.isPlaceholderData`. */
  loading: boolean;
  emptyMessage?: string;
  title?: string;
  globalFilter?: string;

  /**
   * Paging, which the server does. Grouped because the five only make sense
   * together: `total` without `first` points the paginator at the wrong page.
   */
  pagination: {
    /** Total across all pages, from `meta.total`. */
    total: number;
    /** Page size, from `meta.per_page`. */
    rows: number;
    /** Index of the first row on this page, `(page - 1) * pageSize`. */
    first: number;
    onPageChange: (event: DataTablePageEvent) => void;
    /** Defaults to 5/10/25/50/100, plus `total` when that is larger. */
    rowsPerPageOptions?: number[];
  };

  /**
   * Sorting; omit it and the headers are inert. The caller owns the state so it
   * can keep it in the URL, hence a controlled value and a callback.
   */
  sort?: {
    field?: string;
    order?: 1 | -1;
    onSort: (e: DataTableSortEvent) => void;
  };

  /** Checkbox column. Omit it and there is no selection and no checkbox column. */
  selection?: {
    selected: T[];
    onChange: (rows: T[]) => void;
    /**
     * Rows that may not be ticked, such as one already added to what you are
     * adding to. Locking the checkbox is the honest form of "already done":
     * hiding the row makes it look missing. Also drops it out of the header's
     * select-all, which PrimeReact does once this is set.
     */
    isSelectable?: (row: T) => boolean;
    /** Shown on hover over a locked checkbox, so it says why the row cannot be ticked. */
    lockedReason?: string;
  };

  /** Per-row buttons. See `editAction` / `viewAction` for the usual two. */
  rowActions?: RowAction<T>[];
  /** Toolbar buttons. See `createAction` / `deleteSelectedAction`. */
  toolbarActions?: ToolbarAction<T>[];

  // Chrome
  /** Left-hand side of the toolbar: search, scope chips, filter button. */
  headerContent?: React.ReactNode;
  /** Full-width strip directly above the table, e.g. status filter chips. */
  statusChips?: React.ReactNode;
  /** Base name for the downloaded file. */
  fileName?: string;
  /**
   * Export every record matching the list's filters, not just this page: the
   * download button opens ExportDialog, which walks the pages through
   * `fetchPage` (the list's own endpoint, filters and sort). Columns default to
   * the visible table columns. Without it the button exports this page only.
   */
  exportAll?: {
    fetchPage: ExportPageFetcher<T>;
    columns?: ExportColumn<T>[];
    filtersSummary?: string;
  };
  /** Fixed body height with its own scrollbar. Omit to let the page scroll. */
  scrollHeight?: string;
  stripedRows?: boolean;
  /** PrimeReact cell memoisation. On by default; off if a cell must re-render with its parent. */
  cellMemo?: boolean;
};

const PrimeReactDataTable = <T extends DataItem>({
  data,
  columns,
  loading,
  emptyMessage = "No data found.",
  title,
  globalFilter,
  pagination,
  sort,
  selection,
  rowActions = [],
  toolbarActions = [],
  headerContent,
  statusChips,
  fileName = "export",
  exportAll,
  scrollHeight,
  stripedRows = true,
  cellMemo = true,
}: PrimeReactDataTableProps<T>) => {
  const memorisedColumns = useMemo(() => columns, [columns]);
  // One class per table, so a locked-row tooltip only targets its own rows.
  const lockedClass = `gn-locked-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const computedRowsPerPageOptions = useMemo(() => {
    const given = pagination.rowsPerPageOptions;
    if (given && given.length > 0) return given;
    const base = [5, 10, 25, 50, 100];
    // A "show everything" option, but only when that is actually more than the
    // largest step and is not already one of them.
    if (pagination.total > 100 && !base.includes(pagination.total)) {
      return [...base, pagination.total];
    }
    return base;
  }, [pagination.total, pagination.rowsPerPageOptions]);

  /**
   * Only the columns the user has switched away from their default, keyed by
   * field. Holding the overrides rather than the resolved state leaves nothing
   * to re-initialise when the column list changes, and reset is clearing it.
   * Mirroring every column keyed by array index mismatched the moment a screen
   * added one.
   */
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    Record<string, boolean>
  >({});

  const isVisible = (col: ColumnConfig<T>) =>
    visibilityOverrides[col.field] ?? col.visible !== false;

  const toggleColumnVisibility = (col: ColumnConfig<T>) =>
    setVisibilityOverrides((prev) => ({
      ...prev,
      [col.field]: !isVisible(col),
    }));

  const allColumnsSelected = columns.length > 0 && columns.every(isVisible);

  const resetToDefault = () => setVisibilityOverrides({});

  const toggleSelectAll = () => {
    const next = !allColumnsSelected;
    setVisibilityOverrides(
      columns.reduce(
        (acc, col) => {
          acc[col.field] = next;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    );
  };

  const columnMenuRef = useRef<Menu>(null);

  const generateColumnMenuItems = (): MenuItem[] => {
    const selectAll: MenuItem = {
      template: () => (
        <div
          className="flex w-full cursor-pointer items-center gap-2 border-b border-(--border-color) px-3 py-2 hover:bg-(--bg-page)"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            inputId="col-select-all"
            checked={allColumnsSelected}
            onChange={toggleSelectAll}
          />
          <label
            htmlFor="col-select-all"
            className="cursor-pointer select-none text-sm font-semibold text-(--text-primary)"
          >
            {allColumnsSelected ? "Unselect all" : "Select all"}
          </label>
        </div>
      ),
    };

    // Worth its own item because most lists hide five audit columns by default,
    // and after switching a few on there is otherwise no way back.
    const reset: MenuItem = {
      template: () => (
        <div
          className="flex w-full cursor-pointer items-center gap-2 border-b border-(--border-color) px-3 py-2 text-(--text-muted) hover:bg-(--bg-page) hover:text-(--text-primary)"
          onClick={resetToDefault}
        >
          <FiRotateCcw className="text-sm" />
          <span className="text-sm">Reset to default</span>
        </div>
      ),
    };

    const items: MenuItem[] = columns.map((col) => ({
      template: () => (
        <div
          className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-(--bg-page)"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            inputId={`col-${col.field}`}
            checked={isVisible(col)}
            onChange={() => toggleColumnVisibility(col)}
          />
          <label
            htmlFor={`col-${col.field}`}
            className="cursor-pointer select-none text-sm text-(--text-secondary)"
          >
            {col.header}
          </label>
        </div>
      ),
    }));

    return [selectAll, reset, ...items];
  };

  /**
   * One cell as a spreadsheet string. `col.field` walks the row, so a scalar
   * column exports directly; a relation column lands on the nested record, whose
   * name a spreadsheet wants rather than `[object Object]`.
   */
  const exportCell = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (Array.isArray(value))
      return value.map(exportCell).filter(Boolean).join(", ");
    if (typeof value === "object") {
      const named = value as { name?: string; code?: string };
      return named.name ?? named.code ?? "";
    }
    return String(value);
  };

  /**
   * Writes the current page to an .xlsx, with the columns as they are shown.
   * Page only: the row set is whatever the table was handed, and a list needing
   * every matching record exports through its own button that refetches
   * unpaginated.
   */
  const exportToExcel = () => {
    const visible = columns.filter(isVisible);

    const exportData = data.map((item) => {
      const row: Record<string, string> = {};

      visible.forEach((col) => {
        // An accessor wins: a composed cell has no `field` path to walk.
        if (col.exportValue) {
          row[col.header] = exportCell(col.exportValue(item));
          return;
        }

        const value = valueAt(item, col.field);

        row[col.header] =
          col.type === "date" && value
            ? (() => {
                const parsed = new Date(String(value));
                return Number.isNaN(parsed.getTime())
                  ? String(value)
                  : parsed.toLocaleDateString();
              })()
            : exportCell(value);
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    // Otherwise every column is the default width and long names arrive truncated.
    ws["!cols"] = visible.map((col) => ({
      wch: Math.max(14, col.header.length + 2),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // The visible columns as typed export cells, for the all-pages export.
  const tableExportColumns = (): ExportColumn<T>[] =>
    columns.filter(isVisible).map((col) => ({
      header: col.header,
      value: (row: T) => {
        if (col.exportValue) return col.exportValue(row) ?? "";
        const value = valueAt(row, col.field);
        if (col.type === "date" && value) {
          const parsed = new Date(String(value));
          return Number.isNaN(parsed.getTime()) ? String(value) : parsed;
        }
        return exportCell(value);
      },
    }));
  const [exporting, setExporting] = useState(false);

  const selected = selection?.selected ?? [];
  const hasSelection = selected.length > 0;

  const toolbar = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      {/* On a phone the search takes the line and the buttons take the next, right-aligned; side by side from sm up. */}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">{headerContent}</div>

      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
        {toolbarActions
          .filter((action) => !action.requiresSelection || hasSelection)
          .map((action) => (
            <Button
              key={action.key}
              label={
                typeof action.label === "function"
                  ? action.label(selected)
                  : action.label
              }
              icon={action.icon}
              size="small"
              severity={action.severity}
              tooltip={action.tooltip}
              tooltipOptions={{ position: "top" }}
              className={
                action.severity
                  ? "flex! items-center gap-1.5"
                  : "p-button-primary flex! items-center gap-1.5"
              }
              onClick={() => action.onClick(selected)}
            />
          ))}

        <Button
          icon={<FiDownload className="text-sm" />}
          size="small"
          severity="secondary"
          outlined
          // Named for what it does: an export giving 10 of 3,000 rows under the
          // label "Export to Excel" is noticed after the file is sent on.
          tooltip={exportAll ? "Export all matching records" : "Export this page to Excel"}
          tooltipOptions={{ position: "top" }}
          onClick={exportAll ? () => setExporting(true) : exportToExcel}
        />

        <Button
          icon={<FiSettings className="text-sm" />}
          size="small"
          severity="secondary"
          outlined
          tooltip="Column visibility"
          tooltipOptions={{ position: "top" }}
          onClick={(e) => columnMenuRef.current?.toggle(e)}
        />
      </div>

      <Menu
        ref={columnMenuRef}
        popup
        model={generateColumnMenuItems()}
        className="w-auto"
      />
    </div>
  );

  const actionBodyTemplate = (rowData: T) => {
    const applicable = rowActions.filter((action) => !action.hidden?.(rowData));
    if (applicable.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5">
        {applicable.map((action) =>
          action.render ? (
            <React.Fragment key={action.key}>
              {action.render(rowData)}
            </React.Fragment>
          ) : (
            <Button
              key={action.key}
              icon={action.icon}
              rounded
              outlined
              severity={action.severity}
              tooltip={action.tooltip}
              tooltipOptions={{ position: "top" }}
              // An icon alone has no name: screen readers (and tests) read the tooltip's words.
              aria-label={action.tooltip}
              onClick={() => action.onClick(rowData)}
            />
          ),
        )}
      </div>
    );
  };

  // Rendered only when something can actually go in it, otherwise a read-only
  // list carries an empty column headed "Actions".
  const showActionsColumn = rowActions.length > 0 && columns.length > 0;

  const visibleDataCols = columns.filter(isVisible).length;
  const skeletonColCount =
    visibleDataCols + (selection ? 1 : 0) + (showActionsColumn ? 1 : 0);

  // Predefined widths to cycle through: avoids random values on each render
  const SKEL_W = [72, 88, 54, 78, 63, 90, 45, 82, 58, 95, 68, 84];

  const skeleton = (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading the list" role="status">
      {/* thead */}
      <div className="flex items-center gap-4 border-b border-(--border-color) bg-(--bg-page) px-4 py-3">
        {selection && (
          <div className="h-4 w-4 shrink-0 rounded bg-(--border-color)" />
        )}
        {Array.from({ length: visibleDataCols }).map((_, j) => (
          <div
            key={j}
            className="h-3 flex-1 rounded bg-(--border-color)"
            style={{ maxWidth: `${SKEL_W[j % SKEL_W.length]}%` }}
          />
        ))}
        {showActionsColumn && (
          <div className="h-3 w-16 shrink-0 rounded bg-(--border-color)" />
        )}
      </div>

      {/* rows */}
      {Array.from({ length: pagination.rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-(--border-color) px-4 py-4"
        >
          {selection && (
            <div className="h-4 w-4 shrink-0 rounded bg-(--border-color)" />
          )}
          {Array.from({ length: visibleDataCols }).map((_, j) => (
            <div
              key={j}
              className="h-4 flex-1 rounded-md bg-(--border-color)"
              style={{
                width: `${SKEL_W[(i * skeletonColCount + j) % SKEL_W.length]}%`,
                maxWidth: `${100 / visibleDataCols}%`,
              }}
            />
          ))}
          {showActionsColumn && (
            <div className="flex shrink-0 gap-1.5">
              <div className="h-7 w-7 rounded-full bg-(--border-color)" />
              <div className="h-7 w-7 rounded-full bg-(--border-color)" />
            </div>
          )}
        </div>
      ))}

      {/* paginator */}
      <div className="flex items-center justify-between border-t border-(--border-color) px-4 py-3">
        <div className="h-3 w-36 rounded bg-(--border-color)" />
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-8 rounded bg-(--border-color)" />
          ))}
        </div>
        <div className="h-3 w-24 rounded bg-(--border-color)" />
      </div>
    </div>
  );

  return (
    <div className="w-full overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
      {title && (
        <div className="border-b border-(--border-color) px-5 py-3">
          <h3 className="text-base font-semibold text-(--text-primary)">
            {title}
          </h3>
        </div>
      )}

      {/* Toolbar, always visible so search/filters stay usable while loading */}
      <div className="border-b border-(--border-color) bg-(--bg-card) px-4 py-3">
        {toolbar}
      </div>

      {statusChips && (
        <div className="border-b border-(--border-color) bg-(--bg-card) px-4 py-2">
          {statusChips}
        </div>
      )}

      {selection?.lockedReason && (
        <Tooltip target={`.${lockedClass} td[data-p-selection-column="true"]`} content={selection.lockedReason} position="right" />
      )}

      {/* Loading means a new set of rows is on its way (a filter, search, page or sort changed):
          the old rows are not shown under it, so nobody acts on a list that is about to change.
          A background refetch of the same list does not count (callers pass isPending || isPlaceholderData). */}
      {loading ? (
        skeleton
      ) : (
        <DataTable
          cellMemo={cellMemo}
          value={data}
          lazy
          paginator
          rows={pagination.rows}
          rowsPerPageOptions={computedRowsPerPageOptions}
          totalRecords={pagination.total}
          first={pagination.first}
          onPage={pagination.onPageChange}
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-12 text-(--text-muted)">
              <span className="pi pi-inbox mb-3 text-4xl opacity-40" />
              <span className="text-sm font-medium">{emptyMessage}</span>
            </div>
          }
          globalFilter={globalFilter}
          // Under the breakpoint each row becomes a card: one line per column,
          // its heading on the left and the value (or the actions) on the
          // right. PrimeReact renders the headings only in stack mode.
          responsiveLayout="stack"
          breakpoint="960px"
          scrollable={!scrollHeight!}
          scrollHeight={scrollHeight}
          stripedRows={stripedRows}
          showGridlines={false}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
          className="w-full text-sm"
          selectionMode={selection ? "checkbox" : null}
          rowClassName={
            selection?.isSelectable && selection.lockedReason
              ? (row: T) => (selection.isSelectable!(row) ? "" : lockedClass)
              : undefined
          }
          isDataSelectable={
            selection?.isSelectable
              ? (e: { data: unknown }) => selection.isSelectable!(e.data as T)
              : undefined
          }
          selection={selected}
          onSelectionChange={(e: { value: unknown }) => {
            if (Array.isArray(e.value)) selection?.onChange(e.value as T[]);
          }}
          sortMode="single"
          // `removableSort` makes the header 3-state: asc, desc, removed. On the
          // third click PrimeReact reports sortOrder 0, which the caller turns
          // into an absent `sort` param and the server's own default order.
          removableSort
          sortField={sort?.field}
          sortOrder={sort?.order}
          onSort={sort?.onSort}
          pt={{
            thead: { className: "bg-!(--bg-page)" },
            headerRow: { className: "border-b! border-!(--border-color)" },
            bodyRow: {
              className:
                "border-b! border-!(--border-color) hover:bg-!(--bg-page) transition-colors",
            },
            paginator: {
              root: {
                className:
                  "bg-!(--bg-card) border-t! border-!(--border-color) px-4! py-2! text-xs! text-!(--text-muted)",
              },
            },
          }}
        >
          {selection ? (
            <Column
              selectionMode="multiple"
              headerStyle={{ width: "3rem" }}
              exportable={false}
            />
          ) : null}

          {memorisedColumns.map((col) =>
            isVisible(col) ? (
              <Column
                key={col.field}
                field={col.field}
                header={
                  col.headerHint ? (
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.headerHint}
                    </span>
                  ) : (
                    col.header
                  )
                }
                body={col.body}
                sortable={sort ? (col.sortable ?? false) : false}
                // Lets a column show one thing and sort by another, e.g. a vote
                // column that displays a name but sorts on the server's own key.
                sortField={col.sortField ?? col.field}
                headerStyle={{ whiteSpace: "nowrap" }}
                headerClassName="text-xs! font-semibold! uppercase! tracking-wider! text-!(--text-muted) bg-!(--bg-page)"
                bodyClassName="text-!(--text-secondary) py-3!"
              />
            ) : null,
          )}

          {showActionsColumn ? (
            <Column
              body={actionBodyTemplate}
              exportable={false}
              header="Actions"
              headerClassName="text-xs! font-semibold! uppercase! tracking-wider! text-!(--text-muted) bg-!(--bg-page)"
              style={{ minWidth: "7rem" }}
            />
          ) : null}
        </DataTable>
      )}
      {exportAll && (
        <ExportDialog<T> visible={exporting} onHide={() => setExporting(false)} fileName={fileName} fetchPage={exportAll.fetchPage} columns={exportAll.columns ?? tableExportColumns()} filtersSummary={exportAll.filtersSummary} />
      )}
    </div>
  );
};

export default PrimeReactDataTable;
