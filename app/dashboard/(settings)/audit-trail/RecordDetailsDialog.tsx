"use client";

import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import type { ApiResource } from "@/services/types/api";
import type { ActivityLogFields } from "@/services/settings/activity-logs/activity-logs-service";
import {
  humanise,
  logSeverity,
  shortModel,
  splitProperties,
  formatDateTime,
  relativeTime,
  fieldChanges,
  snapshotValues,
  requestPayload,
  outcomeOf,
  displayValue,
  cascadeCounts,
  bulkRecords,
  partitionFields,
  isListField,
  isObjectField,
  isListDiff,
  summariseValue,
  type SnapshotField,
  type ScalarField,
  type ListField,
  type ListDiffField,
  type ListSnapshotField,
  type ObjectField,
  type ListColumn,
  type ListRow,
} from "./helpers";

interface RecordDetailsDialogProps {
  visible: boolean;
  onHide: () => void;
  selectedRecord: ApiResource<ActivityLogFields> | null;
  causerName: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </p>
      <div className="wrap-break-word text-sm text-(--text-primary)">{value ?? "-"}</div>
    </div>
  );
}

function PropertyTable({ rows }: { rows: Record<string, unknown> }) {
  const entries = Object.entries(rows);
  if (!entries.length) {
    return <p className="text-sm text-(--text-muted)">Nothing recorded.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-(--border-color)">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value], i) => (
            <tr
              key={key}
              className={i % 2 ? "bg-(--bg-page)" : "bg-(--bg-card)"}
            >
              <td className="w-2/5 px-3 py-2 align-top font-medium text-(--text-muted)">
                {humanise(key)}
              </td>
              <td className="wrap-break-word px-3 py-2 align-top text-(--text-primary)">
                {value === null || value === undefined || value === ""
                  ? "-"
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A collection a create or delete recorded, shown inline in the value cell.
 *
 * There is no "before" to compare against, so the rows are simply listed. A single-column
 * list (the common case, e.g. service-area names) reads best as chips; anything wider
 * keeps its columns.
 */
function ListValue({ field }: { field: ListSnapshotField }) {
  const columns = field.columns ?? [];
  const rows = field.rows ?? [];

  if (field.strategy === "count" || (!rows.length && !field.ids?.length)) {
    return (
      <span className="text-(--text-muted)">
        {field.total.toLocaleString()} {field.total === 1 ? "row" : "rows"}
      </span>
    );
  }

  // strategy: ids, for a collection too large to record whole. Only the
  // identities were frozen.
  if (field.strategy === "ids") {
    return (
      <span className="font-mono text-xs text-(--text-secondary)">
        {(field.ids ?? []).join(", ")}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {columns.length <= 1 ? (
        <div className="flex flex-wrap gap-1">
          {rows.map((row, i) => (
            <span
              key={i}
              className="rounded-full bg-(--bg-page) px-2 py-0.5 text-xs text-(--text-primary)"
            >
              {displayValue(columns.length ? row[columns[0].key] : Object.values(row)[0])}
            </span>
          ))}
        </div>
      ) : (
        <RowTable columns={columns} rows={rows} />
      )}
      {!!field.overflow && (
        <p className="text-xs text-(--text-muted)">
          and {field.overflow.toLocaleString()} more not detailed here.
        </p>
      )}
    </div>
  );
}

/** A bare rows-by-columns table, used wherever a collection is listed without a diff. */
function RowTable({ columns, rows }: { columns: ListColumn[]; rows: ListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-(--border-color)">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-(--bg-page)">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-(--text-muted)"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-(--border-color)">
              {columns.map((column) => (
                <td key={column.key} className="px-2 py-1.5 align-top text-(--text-primary)">
                  {displayValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A `{ label, type, value }` map rendered as a plain two-column table. Labels come from
 * the backend's snapshotSchema(), so this never has to guess how to title a field.
 *
 * Collections come through the same map with `kind: 'list'` and render as rows inside
 * their own cell.
 */
function SnapshotTable({ fields }: { fields: Record<string, SnapshotField> }) {
  const entries = Object.entries(fields);
  if (!entries.length) {
    return <p className="text-sm text-(--text-muted)">Nothing recorded.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-(--border-color)">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, field], i) => (
            <tr key={key} className={i % 2 ? "bg-(--bg-page)" : "bg-(--bg-card)"}>
              <td className="w-2/5 px-3 py-2 align-top font-medium text-(--text-muted)">
                {field.label ?? humanise(key)}
              </td>
              <td className="wrap-break-word px-3 py-2 align-top text-(--text-primary)">
                {isObjectField(field) ? (
                  <SnapshotTable fields={field.fields} />
                ) : !isListField(field) ? (
                  displayValue(field.value)
                ) : isListDiff(field) ? (
                  summariseValue(field)
                ) : (
                  <ListValue field={field} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The before/after table for an update.
 *
 * Old values read red and struck through, new values green, the whole point of the audit
 * trail is that "what changed" is legible at a glance, not buried in a JSON blob.
 */
function ChangesTable({ changes }: { changes: Record<string, ScalarField> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-(--border-color)">
      <table className="w-full min-w-lg text-sm">
        <thead>
          <tr className="bg-(--bg-page)">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Field
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Before
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(changes).map(([field, change]) => (
            <tr key={field} className="border-t border-(--border-color)">
              <td className="px-3 py-2 align-top font-medium text-(--text-muted)">
                {change.label ?? humanise(field)}
              </td>
              <td className="px-3 py-2 align-top">
                <span className="wrap-break-word text-red-600 line-through dark:text-red-400">
                  {displayValue(change.old)}
                </span>
              </td>
              <td className="px-3 py-2 align-top">
                <span className="wrap-break-word text-emerald-600 dark:text-emerald-400">
                  {displayValue(change.new)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One count chip in a list diff's header, hidden entirely when it is zero. */
function CountChip({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  if (!count) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {count.toLocaleString()} {label}
    </span>
  );
}

/**
 * A related collection's row-level diff.
 *
 * Rows are matched on their identity key before they get here, so an edited row arrives
 * as `changed` with both sides rather than as a removal plus an unrelated-looking
 * addition. Unchanged rows are only ever a count: reprinting the seven service areas
 * that did not move would bury the one that did.
 */
function ListDiffBlock({ field }: { field: ListDiffField }) {
  const columns = field.columns ?? [];
  const overflow = field.overflow;
  const dropped =
    (overflow?.added ?? 0) + (overflow?.removed ?? 0) + (overflow?.changed ?? 0);

  const stateCell = (label: string, className: string) => (
    <td className={`whitespace-nowrap px-2 py-1.5 align-top font-medium ${className}`}>
      {label}
    </td>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
          {field.label}
        </p>
        <CountChip
          label="added"
          count={field.counts.added}
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        />
        <CountChip
          label="removed"
          count={field.counts.removed}
          className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
        />
        <CountChip
          label="changed"
          count={field.counts.changed}
          className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <CountChip
          label="unchanged"
          count={field.unchanged}
          className="bg-(--bg-page) text-(--text-muted)"
        />
      </div>

      {/* strategy: count records how much moved but not what, so there is nothing to table. */}
      {field.strategy !== "count" && columns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-(--border-color)">
          <table className="w-full min-w-lg text-xs">
            <thead>
              <tr className="bg-(--bg-page)">
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-(--text-muted)">
                  Change
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-(--text-muted)"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(field.added ?? []).map((row, i) => (
                <tr
                  key={`added-${i}`}
                  className="border-t border-(--border-color) bg-emerald-50/60 dark:bg-emerald-950/20"
                >
                  {stateCell("Added", "text-emerald-700 dark:text-emerald-400")}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-2 py-1.5 align-top text-emerald-700 dark:text-emerald-400"
                    >
                      {displayValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {(field.removed ?? []).map((row, i) => (
                <tr
                  key={`removed-${i}`}
                  className="border-t border-(--border-color) bg-red-50/60 dark:bg-red-950/20"
                >
                  {stateCell("Removed", "text-red-700 dark:text-red-400")}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-2 py-1.5 align-top text-red-700 line-through dark:text-red-400"
                    >
                      {displayValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {(field.changed ?? []).map((pair, i) => (
                <tr
                  key={`changed-${i}`}
                  className="border-t border-(--border-color) bg-amber-50/60 dark:bg-amber-950/20"
                >
                  {stateCell("Changed", "text-amber-700 dark:text-amber-400")}
                  {columns.map((column) => {
                    const before = displayValue(pair.old?.[column.key]);
                    const after = displayValue(pair.new?.[column.key]);

                    // Only the columns that actually moved get the before/after
                    // treatment; the rest are the row's identity, shown plainly.
                    return (
                      <td key={column.key} className="px-2 py-1.5 align-top">
                        {before === after ? (
                          <span className="text-(--text-primary)">{after}</span>
                        ) : (
                          <span className="wrap-break-word">
                            <span className="text-red-600 line-through dark:text-red-400">
                              {before}
                            </span>
                            <span className="mx-1 text-(--text-muted)">&rarr;</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {after}
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dropped > 0 && (
        <p className="text-xs text-(--text-muted)">
          and {dropped.toLocaleString()} more not detailed here.
        </p>
      )}
    </div>
  );
}

/** Each changed collection gets its own block; a create's collections do not come here. */
function ListChanges({ lists }: { lists: Record<string, ListField> }) {
  return (
    <div className="space-y-4">
      {Object.entries(lists).map(([key, field]) =>
        isListDiff(field) ? <ListDiffBlock key={key} field={field} /> : null
      )}
    </div>
  );
}

/**
 * A nested record's changes, under its own heading.
 *
 * The presenter only writes an object at all when something inside it moved, and only
 * writes the sub-fields that moved, so this never renders a titled empty section. It
 * recurses through the same partition as the top level, which is what lets a collection
 * sit inside an object without any special case here.
 */
function ObjectChanges({ objects }: { objects: Record<string, ObjectField> }) {
  return (
    <div className="space-y-4">
      {Object.entries(objects).map(([key, field]) => {
        const inner = partitionFields(field.fields);

        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              {field.label}
            </p>
            {Object.keys(inner.scalars).length > 0 && (
              <ChangesTable changes={inner.scalars} />
            )}
            {Object.keys(inner.lists).length > 0 && <ListChanges lists={inner.lists} />}
            {Object.keys(inner.objects).length > 0 && (
              <ObjectChanges objects={inner.objects} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const RecordDetailsDialog: React.FC<RecordDetailsDialogProps> = ({
  visible,
  onHide,
  selectedRecord,
  causerName,
}) => {

  // Nothing selected, nothing to show. This is an early return rather than
  // optional chaining on every field because JSX children are built eagerly:
  // `value={<span>{selectedRecord.id}</span>}` is evaluated while this
  // component renders, long before Dialog decides whether `visible` lets it
  // through. Without this the page throws on mount, not on click.
  if (!selectedRecord) return null;
  const a = selectedRecord;
  const { context, request, payload } = splitProperties(a?.properties);
  // A column edit and a relationship edit are different reads, so they get their own
  // sections rather than one table trying to show rows in a "Before" cell.
  const {
    scalars: changes,
    lists: changedLists,
    objects: changedObjects,
  } = partitionFields(fieldChanges(a?.properties));
  const snapshot = snapshotValues(a?.properties);
  const body = requestPayload(a?.properties);
  const outcome = outcomeOf(a?.properties);
  const cascade = cascadeCounts(a?.properties);
  const bulk = bulkRecords(a?.properties);

  return (
    <Dialog
      header={
        <div className="flex items-center gap-2">
          <span className="pi pi-history text-lg text-(--brand-ink)" />
          <span>Activity details</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: "min(56rem, 95vw)" }}
      modal
      maximizable
      footer={<Button label="Close" icon="pi pi-times" text onClick={onHide} />}
    >
      {!selectedRecord || !a ? (
        <p className="p-4 text-sm text-(--text-muted)">No record selected.</p>
      ) : (
        <div className="space-y-6 p-1">
          <div className="rounded-lg border border-(--border-color) bg-(--bg-page) p-4">
            <p className="text-sm text-(--text-primary)">{a.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Tag
                value={humanise(a.log_name)}
                severity={logSeverity(a.event)}
                className="text-xs"
              />
              <Tag
                value={outcome === "failed" ? "Failed" : "Success"}
                severity={outcome === "failed" ? "danger" : "success"}
                className="text-xs"
              />
              <span className="text-xs text-(--text-muted)">
                {formatDateTime(a.created_at)} · {relativeTime(a.created_at)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Performed by" value={causerName} />
            <Field label="Module" value={a.log_name ? humanise(a.log_name) : "-"} />
            <Field label="Event" value={a.event ? humanise(a.event) : "-"} />
            <Field label="Affected record" value={shortModel(a.subject_type)} />
            <Field
              label="Record ID"
              value={<span className="font-mono text-xs">{a.subject_id ?? "-"}</span>}
            />
            <Field
              label="Entry ID"
              value={<span className="font-mono text-xs">{selectedRecord.id}</span>}
            />
          </div>

          {/* An update: exactly which fields moved, and from what to what. */}
          {Object.keys(changes).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Field changes
              </p>
              <ChangesTable changes={changes} />
            </div>
          )}

          {/* Related records the edit attached, detached or edited in place. */}
          {Object.keys(changedLists).length > 0 && <ListChanges lists={changedLists} />}

          {/* Detail rows that belong to this record but live on their own table. */}
          {Object.keys(changedObjects).length > 0 && (
            <ObjectChanges objects={changedObjects} />
          )}

          {/* A create or delete has no "before", so the values are listed flat. */}
          {Object.keys(snapshot).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Recorded values
              </p>
              <SnapshotTable fields={snapshot} />
            </div>
          )}

          {/* What a cascading delete took down with the record. Counted before the
              delete, because the database removes descendants without firing an event. */}
          {Object.keys(cascade).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Also destroyed by this delete
              </p>
              <div className="flex flex-wrap gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
                {Object.entries(cascade).map(([level, count]) => (
                  <span
                    key={level}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {level}
                    <span className="font-bold">{count.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bulk deletes name every record they removed, not just its id. */}
          {bulk.records.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Records removed ({bulk.total.toLocaleString()})
              </p>
              <div className="space-y-2">
                {bulk.records.map((record, i) => (
                  <SnapshotTable key={i} fields={record} />
                ))}
              </div>
              {bulk.truncated > 0 && (
                <p className="text-xs text-(--text-muted)">
                  …and {bulk.truncated.toLocaleString()} more not detailed here.
                </p>
              )}
            </div>
          )}

          {Object.keys(payload).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Details
              </p>
              <PropertyTable rows={payload} />
            </div>
          )}

          {/* Verbatim, so it shows what was sent rather than what we made of it. */}
          {Object.keys(body).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Submitted request (as received)
              </p>
              <PropertyTable rows={body} />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Who &amp; where
            </p>
            <PropertyTable rows={context} />
          </div>

          {Object.keys(request).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                Request trace
              </p>
              <PropertyTable rows={request} />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default RecordDetailsDialog;
