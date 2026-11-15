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

// ── Vendors and shops (kheengz-laravel docs/vendors-and-shops.md) ─────────────

/** App\Enums\VendorStatus. */
export type VendorStatus = "Pending" | "Approved" | "Rejected" | "Suspended";
/** App\Enums\VendorKind. */
export type VendorKind = "Individual" | "Company";
/** App\Enums\VendorMemberRole: a place inside a vendor, never an account role. */
export type VendorMemberRole = "Owner" | "Staff";
/** App\Enums\VendorDocumentType. */
export type VendorDocumentType = "National ID (front)" | "National ID (back)" | "Business registration" | "Other";
/** App\Enums\ShopType (D24). */
export type ShopType = "Household & home" | "Electronics & phones" | "Groceries & fresh produce" | "Fashion & beauty" | "Hardware & building" | "General";
/** App\Enums\ShopStatus. */
export type ShopStatus = "Draft" | "Pending review" | "Changes requested" | "Active" | "Rejected" | "Suspended" | "Closed";
/** App\Enums\ShopReviewDecision. */
export type ShopReviewDecision = "Submitted" | "Approved" | "Changes requested" | "Rejected" | "Suspended" | "Reinstated" | "Closed";
/** App\Enums\PayoutMethod. */
export type PayoutMethod = "Mobile Money" | "Bank";
/** App\Enums\PayoutDestinationStatus. */
export type PayoutDestinationStatus = "Verified" | "Awaiting review" | "Rejected";

export const SHOP_TYPES: ShopType[] = ["Household & home", "Electronics & phones", "Groceries & fresh produce", "Fashion & beauty", "Hardware & building", "General"];
export const SHOP_STATUSES: ShopStatus[] = ["Draft", "Pending review", "Changes requested", "Active", "Rejected", "Suspended", "Closed"];
export const VENDOR_STATUSES: VendorStatus[] = ["Pending", "Approved", "Rejected", "Suspended"];

/** VendorDocumentResource: no file URL, the file comes through an authorised request. */
export interface VendorDocument {
  id: string;
  type: VendorDocumentType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  checked_at: string | null;
  created_at: string | null;
}

/** VendorMemberResource. */
export interface VendorMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: RecordStatus;
  role: VendorMemberRole;
  shop_ids?: string[];
}

/** PayoutDestinationResource. */
export interface PayoutDestination {
  id: string;
  vendor_id: string;
  method: PayoutMethod;
  network: MobileNetwork | null;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string;
  account_name: string;
  checked_name: string | null;
  label: string;
  status: PayoutDestinationStatus;
  status_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

/** LocationResource. */
export interface ShopLocation {
  id: string;
  shop_id: string;
  name: string;
  address: string;
  area: string;
  phone: string | null;
  opening_hours: string | null;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** ShopReviewResource. */
export interface ShopReview {
  id: string;
  decision: ShopReviewDecision;
  reason: string | null;
  created_at: string | null;
  created_by?: UserReference | null;
}

/** ShopResource. */
export interface Shop extends Audited {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  address: string;
  shop_type: ShopType;
  description: string | null;
  phone: string;
  email: string | null;
  status: ShopStatus;
  status_reason: string | null;
  approved_at: string | null;
  commission_bps: number | null;
  debt_limit_amount: number | null;
  debt_limit_days: number | null;
  payout_destination_id: string | null;
  payout_destination?: PayoutDestination | null;
  vendor?: { id: string; name: string; status: VendorStatus };
  locations_count?: number;
  locations?: ShopLocation[];
  reviews?: ShopReview[];
}

/** VendorResource. */
export interface Vendor extends Audited {
  id: string;
  name: string;
  kind: VendorKind;
  national_id_number: string;
  registration_number: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  status: VendorStatus;
  status_reason: string | null;
  approved_at: string | null;
  /** The caller's own place in this vendor, or null for a reviewer. */
  my_role?: VendorMemberRole | null;
  shops_count?: number;
  missing_documents?: VendorDocumentType[];
  documents?: VendorDocument[];
  payout_destinations?: PayoutDestination[];
  shops?: Shop[];
  members?: VendorMember[];
}

/** PlatformSettingsResource. */
export interface PlatformSettings {
  commission_bps: number;
  fixed_fee_per_order: number;
  service_fee_per_order: number;
  debt_limit_amount: number;
  debt_limit_days: number;
  marzpay_enabled: boolean;
  olycash_enabled: boolean;
  card_enabled: boolean;
  pay_on_delivery_enabled: boolean;
  updated_at: string | null;
}

/** A bank MarzPay can check and pay into (GET /payout-banks). */
export interface PayoutBank {
  code: string;
  name: string;
  aliases: string[];
}
