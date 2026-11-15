/**
 * Presentation helpers for activity-log rows.
 *
 * `log_name` holds the **module** (`User`, `Queue`, later `Order`) and `event` the
 * specific action (`user_updated`). Colour is derived from the event's shape
 * rather than a fixed enum, so a new controller logging `vote_updated` gets
 * sensible styling with no change here.
 */

export type Severity =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "secondary"
  | "contrast";

/** `service_area_bulk_deleted` to `Service Area Bulk Deleted` */
export function humanise(value?: string | null): string {
  if (!value) return "-";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Colour by the verb at the end of the log name. */
export function logSeverity(logName?: string | null): Severity {
  const n = (logName ?? "").toLowerCase();
  if (n.includes("delete")) return "danger";
  if (n.includes("creat")) return "success";
  if (n.includes("updat") || n.includes("sync")) return "info";
  if (n.includes("login") || n.includes("logout")) return "secondary";
  if (n.includes("fail") || n.includes("error")) return "warning";
  return "contrast";
}

/** `App\Models\ServiceArea` to `ServiceArea` */
export function shortModel(fqcn?: string | null): string {
  if (!fqcn) return "-";
  const parts = fqcn.split("\\");
  return parts[parts.length - 1] || fqcn;
}

/**
 * LoggableTrait always stamps these onto `properties`. Splitting them out lets the
 * details dialog show "who / where / on what device" separately from the domain
 * payload the controller added (e.g. `service_area_id`).
 */
const CONTEXT_KEYS = [
  "created_by",
  "created_by_email",
  "ip",
  "country",
  "city",
  "region",
  "latitude",
  "longitude",
  "timezone",
  "user_agent",
  "device",
  "platform",
  "platform_version",
  "browser",
  "browser_version",
];

/** HTTP context: which request this was, so an entry can be traced to the app logs. */
const REQUEST_KEYS = ["request_id", "method", "url", "route"];

/** Rendered by their own dedicated sections, never in the generic property table. */
const STRUCTURED_KEYS = [
  "changes",
  "snapshot",
  "request",
  "outcome",
  "cascade",
  "records",
  "count",
  "records_truncated",
];

export function splitProperties(properties?: Record<string, unknown> | null): {
  context: Record<string, unknown>;
  request: Record<string, unknown>;
  payload: Record<string, unknown>;
} {
  const context: Record<string, unknown> = {};
  const request: Record<string, unknown> = {};
  const payload: Record<string, unknown> = {};

  Object.entries(properties ?? {}).forEach(([key, value]) => {
    if (CONTEXT_KEYS.includes(key)) context[key] = value;
    else if (REQUEST_KEYS.includes(key)) request[key] = value;
    else if (STRUCTURED_KEYS.includes(key)) return;
    else payload[key] = value;
  });

  return { context, request, payload };
}

/**
 * One scalar field as the backend's SnapshotPresenter froze it. `label` and `type` come
 * from the model's `snapshotSchema()`, so the UI never has to guess how to title or
 * render a field.
 */
export interface ScalarField {
  label: string;
  type: string;
  value?: unknown;
  old?: unknown;
  new?: unknown;
}

/** How much of a collection the backend chose to record. See SnapshotPresenter. */
export type ListStrategy = "summary" | "ids" | "count";

/** One visible column of a list field, already titled by `snapshotSchema()`. */
export interface ListColumn {
  key: string;
  label: string;
  type: string;
}

export type ListRow = Record<string, unknown>;

/** A collection frozen onto a create or delete: the rows as they stood. */
export interface ListSnapshotField {
  label: string;
  kind: "list";
  strategy: ListStrategy;
  total: number;
  ids?: string[];
  columns?: ListColumn[];
  rows?: ListRow[];
  /** Rows past the backend's cap, recorded as a count so the entry stays honest. */
  overflow?: number;
}

/**
 * A collection's before/after, matched on identity, which is what buys "changed" over
 * "removed + added". `unchanged` is only ever a count: reprinting the seven rows that
 * did not move buries the one that did.
 */
export interface ListDiffField {
  label: string;
  kind: "list";
  strategy: ListStrategy;
  unchanged: number;
  counts: { added: number; removed: number; changed: number };
  columns?: ListColumn[];
  added?: ListRow[];
  removed?: ListRow[];
  changed?: { old: ListRow; new: ListRow }[];
  overflow?: { added: number; removed: number; changed: number };
}

export type ListField = ListSnapshotField | ListDiffField;

/**
 * A nested record: a hasOne detail row or a JSON column with its own labelled
 * sub-fields. Its `fields` map is the same envelope one level in, so a list can sit
 * inside an object and everything below renders through the same components.
 */
export interface ObjectField {
  label: string;
  kind: "object";
  fields: Record<string, SnapshotField>;
}

/** Every envelope the presenter emits for one field. */
export type SnapshotField = ScalarField | ListField | ObjectField;

export function isListField(field: SnapshotField): field is ListField {
  return (field as { kind?: unknown }).kind === "list";
}

export function isObjectField(field: SnapshotField): field is ObjectField {
  return (field as { kind?: unknown }).kind === "object";
}

export function isListDiff(field: ListField): field is ListDiffField {
  return "counts" in field;
}

/**
 * The three envelopes render as completely different things, so callers get them
 * apart rather than type-testing inside JSX.
 */
export function partitionFields(fields: Record<string, SnapshotField>): {
  scalars: Record<string, ScalarField>;
  lists: Record<string, ListField>;
  objects: Record<string, ObjectField>;
} {
  const scalars: Record<string, ScalarField> = {};
  const lists: Record<string, ListField> = {};
  const objects: Record<string, ObjectField> = {};

  Object.entries(fields).forEach(([key, field]) => {
    if (isListField(field)) lists[key] = field;
    else if (isObjectField(field)) objects[key] = field;
    else scalars[key] = field;
  });

  return { scalars, lists, objects };
}

/** A foreign key frozen as `{ id, label }`: readable now, still linkable later. */
export interface RelationValue {
  id: string;
  label: string | null;
}

function isRelationValue(value: unknown): value is RelationValue {
  return !!value && typeof value === "object" && !Array.isArray(value) && "id" in value;
}

/**
 * The field-level diff an update wrote. Anything not matching the expected envelope is
 * dropped rather than rendered as `[object Object]`.
 */
export function fieldChanges(
  properties?: Record<string, unknown> | null
): Record<string, SnapshotField> {
  return pickFields(properties?.changes, isKnownEnvelope);
}

/** The values a create or delete recorded, in the same envelope. */
export function snapshotValues(
  properties?: Record<string, unknown> | null
): Record<string, SnapshotField> {
  return pickFields(properties?.snapshot, isKnownEnvelope);
}

/**
 * Anything the presenter could have written for one field. Kept in one place because
 * the cost of getting it wrong is silent: a field that fails this test vanishes from
 * the UI while sitting correctly in the database.
 */
function isKnownEnvelope(field: Record<string, unknown>): boolean {
  return (
    "old" in field ||
    "new" in field ||
    "value" in field ||
    field.kind === "list" ||
    field.kind === "object"
  );
}

function pickFields(
  raw: unknown,
  accept: (field: Record<string, unknown>) => boolean
): Record<string, SnapshotField> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: Record<string, SnapshotField> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, field]) => {
    if (field && typeof field === "object" && !Array.isArray(field) && accept(field as Record<string, unknown>)) {
      out[key] = field as unknown as SnapshotField;
    }
  });
  return out;
}

/** `{ Products: 8, Photos: 31 }`, what a cascading delete took down with it. */
export function cascadeCounts(
  properties?: Record<string, unknown> | null
): Record<string, number> {
  const raw = properties?.cascade;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: Record<string, number> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([level, count]) => {
    if (typeof count === "number") out[level] = count;
  });
  return out;
}

/** The per-record snapshots a bulk delete captured before removing them. */
export function bulkRecords(
  properties?: Record<string, unknown> | null
): { records: Record<string, SnapshotField>[]; total: number; truncated: number } {
  const raw = properties?.records;
  const records = Array.isArray(raw)
    ? raw.map((r) => pickFields(r, (f) => "value" in f || f.kind === "list"))
    : [];

  return {
    records,
    total: typeof properties?.count === "number" ? properties.count : records.length,
    truncated:
      typeof properties?.records_truncated === "number" ? properties.records_truncated : 0,
  };
}

/**
 * The request body exactly as it arrived: ids, extra fields and all.
 *
 * Deliberately NOT resolved through the schema. `snapshot`/`changes` are the readable view;
 * this is the wire record, kept verbatim because you cannot know in advance which question
 * it will end up answering.
 */
export function requestPayload(
  properties?: Record<string, unknown> | null
): Record<string, unknown> {
  const raw = properties?.request;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export function outcomeOf(properties?: Record<string, unknown> | null): string {
  const value = properties?.outcome;
  return typeof value === "string" ? value : "success";
}

/**
 * Renders any frozen value as something readable in a table cell.
 *
 * A relation arrives as `{ id, label }`: the label is what the actor saw at the time, so
 * that is what is shown. Falling back to the id when a label could not be resolved is
 * deliberate, an unresolvable reference still beats showing nothing.
 */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isRelationValue(value)) return value.label ?? `#${value.id}`;
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** The first visible column of a row, which is the one worth reading in a one-liner. */
function rowLabel(row: ListRow, columns?: ListColumn[]): string {
  const key = columns?.[0]?.key;
  return displayValue(key ? row[key] : Object.values(row)[0]);
}

/**
 * A collection reduced to a single line, for table cells that have no room for rows:
 * what moved for a diff, what it holds for a snapshot.
 */
export function summariseList(field: ListField): string {
  if (isListDiff(field)) {
    const { added, removed, changed } = field.counts;
    const parts: string[] = [];
    if (added) parts.push(`+${added}`);
    if (removed) parts.push(`-${removed}`);
    if (changed) parts.push(`${changed} changed`);
    return parts.length ? parts.join(", ") : "no change";
  }

  if (field.rows?.length) {
    const names = field.rows.map((row) => rowLabel(row, field.columns)).join(", ");
    return field.overflow ? `${names} +${field.overflow} more` : names;
  }

  return `${field.total} ${field.total === 1 ? "row" : "rows"}`;
}

/** A nested record reduced to one line: its sub-fields, flattened the same way. */
function summariseObject(
  field: ObjectField,
  summarise: (sub: SnapshotField) => string
): string {
  return Object.values(field.fields)
    .map((sub) => `${sub.label}: ${summarise(sub)}`)
    .join(", ");
}

/** One field of an update, flattened to `before to after` or a nested summary. */
export function summariseChange(field: SnapshotField): string {
  if (isListField(field)) return summariseList(field);
  if (isObjectField(field)) return summariseObject(field, summariseChange);
  return `${displayValue(field.old)} → ${displayValue(field.new)}`;
}

/** One recorded value, flattened the same way. */
export function summariseValue(field: SnapshotField): string {
  if (isListField(field)) return summariseList(field);
  if (isObjectField(field)) return summariseObject(field, summariseValue);
  return displayValue(field.value);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

/** "3 minutes ago": cheap relative time, no dependency. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secondsPerUnit] of units) {
    const amount = Math.floor(Math.abs(seconds) / secondsPerUnit);
    if (amount >= 1) return rtf.format(-Math.sign(seconds) * amount, unit);
  }
  return rtf.format(0, "second");
}
