/**
 * The Kheengz API's shapes, mirroring the Laravel resources in app/Http/Resources. Money is whole
 * shillings (integers), dates are UTC ISO strings, statuses are the values of the Laravel enums in
 * app/Enums. Each Phase 1 module (shops, products, orders, payouts) adds its own shapes here.
 */

/** App\Enums\RecordStatus. */
export type RecordStatus = "Active" | "Inactive";

/** App\Enums\MobileNetwork. */
export type MobileNetwork = "MTN" | "Airtel";

/** App\Enums\PhotoSource: our file from a device, our copy of a pasted link, or an outside address we only show. */
export type PhotoSource = "Upload" | "Link" | "External";

/** Who created or last changed a record (the API's UserReferenceResource). */
export interface UserReference {
  id: string;
  name: string;
  email?: string | null;
}

/** The audit fields a list shows as hidden columns and a details dialog at its foot. */
export interface Audited {
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: UserReference | null;
  updated_by?: UserReference | null;
}

/** One day on a chart: an amount in shillings and how many records made it. */
export interface DailyPoint {
  date: string;
  amount: number;
  count?: number;
}

/** A Laravel paginated collection, as axios hands it back in `.data`. */
export interface Paginated<T> {
  data: T[];
  meta: { total: number; per_page: number; current_page: number; last_page: number };
  links?: unknown;
}
