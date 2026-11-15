/**
 * What each `records.changed` broadcast refreshes.
 *
 * The API sends `records.changed` ({ resource, id, vendor_id }) on the private channel of everyone
 * a change concerns (App\Events\RecordsChanged). A signal, not the record (Alpha's
 * ApprovalDecided): the screen refetches every query root that shows that resource, with its own
 * page and filters.
 *
 * One entry per RecordsChanged constant on the API; each Phase 1 module adds its own (orders,
 * payouts). Add a root here when a new screen shows one of these resources, or that screen stays
 * stale on the other laptop until someone switches tabs.
 */
export const LIVE_ROOTS: Record<string, string[]> = {
  users: ["users"],
};

export interface RecordsChanged {
  resource: string;
  id: string | null;
  vendor_id: string | null;
}
