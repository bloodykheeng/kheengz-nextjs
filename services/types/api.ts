/**
 * Shared shapes for the `/api/v1` contract.
 *
 * Every index endpoint runs through Spatie QueryBuilder and every response is a
 * plain Laravel resource, so the param and row shapes are identical across
 * domains, they live here instead of being restated in each service file.
 */

/** Query params accepted by every index endpoint. */
export interface ListParams {
  page?: number;
  per_page?: number;
  sort?: string;
  include?: string;
  all?: boolean;
  /** `filter[...]` keys vary per resource: see each service's own interface. */
  [filterKey: string]: string | number | boolean | undefined;
}

/**
 * One row of a collection.
 *
 * The record itself, with its own id. Relations the request asked for with
 * `include=` are nested in place under their own name, so a product's shop
 * is `row.shop`, not a pointer that has to be resolved against a separate
 * array. Absent when not included, which is why relation fields are optional.
 */
export type ApiResource<A = Record<string, unknown>> = A & {
  id: string;
};

/** Pagination block Laravel puts on a paginated resource collection. */
export interface ApiMeta {
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
}

export interface ApiCollection<A = Record<string, unknown>> {
  data: ApiResource<A>[];
  meta?: ApiMeta;
}

/** A related record nested by `include=`, as a picker or a chip shows it. */
export interface RelatedRecord {
  id: string;
  /**
   * Always present: every resource that can be nested as a relation returns a `name`. Optional
   * here would make every form that holds a relation optional too, and let a picker be handed a
   * value it cannot render.
   */
  name: string;
  code?: string;
}

/** Fields every reference-data record carries. */
export interface AuditFields {
  status: string;
  created_at: string | null;
  updated_at: string | null;
  created_by?: RelatedRecord | null;
  updated_by?: RelatedRecord | null;
}

/**
 * Drops empty params so we never send `filter[search]=` (which QueryBuilder
 * treats as a real, always-failing filter) or `page=undefined`.
 */
export function cleanParams<T extends object>(params: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );
}

// Reducing a nested relation to what a picker or a chip needs is a display
// concern, so those helpers live in `lib/relations.ts` rather than here with
// the request shaping.
