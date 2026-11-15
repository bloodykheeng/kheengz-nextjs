import axiosAPI from "../axiosApi";
import { cleanParams } from "../types/api";
import type {
  Paginated,
  PayoutBank,
  PayoutDestination,
  PlatformSettings,
  Shop,
  ShopLocation,
  Vendor,
  VendorDocument,
  VendorDocumentType,
  VendorMember,
  VendorMemberRole,
} from "../types/kheengz";

/**
 * Vendors, their papers, members and payout destinations; shops, their review and locations; the
 * platform settings. One function per endpoint of kheengz-laravel routes/api.php (docs/vendors-and-shops.md).
 */

type Params = Record<string, string | number | boolean | undefined | null>;
type Saved<T> = { message: string; data: T };
type Done = { message: string };

// ── "Sell on Kheengz" ─────────────────────────────────────────────────────────

export interface VendorApplication {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  vendor_name: string;
  kind: "Individual" | "Company";
  national_id_number: string;
  registration_number?: string | null;
  address?: string | null;
  accept_terms: boolean;
}

export async function applyToSell(payload: VendorApplication) {
  const { data } = await axiosAPI.post<{ message: string; data: { email: string; verification_required: true; code_sent: boolean } }>("/v1/vendor-applications", payload);
  return data;
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function getVendors(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<Vendor>>("/v1/vendors", { params: cleanParams(params) });
  return data;
}

export async function getVendor(id: string) {
  const { data } = await axiosAPI.get<{ data: Vendor }>(`/v1/vendors/${id}`);
  return data.data;
}

export async function updateVendor(id: string, payload: Partial<Pick<Vendor, "name" | "kind" | "national_id_number" | "registration_number" | "phone" | "email" | "address">>) {
  const { data } = await axiosAPI.put<Saved<Vendor>>(`/v1/vendors/${id}`, payload);
  return data;
}

export async function resubmitVendor(id: string) {
  const { data } = await axiosAPI.post<Saved<Vendor>>(`/v1/vendors/${id}/resubmit`);
  return data;
}

export type VendorDecision = "approve" | "reject" | "suspend" | "reinstate";

export async function decideVendor(id: string, decision: VendorDecision, reason?: string) {
  const { data } = await axiosAPI.post<Saved<Vendor>>(`/v1/vendors/${id}/${decision}`, reason ? { reason } : {});
  return data;
}

// ── Papers ────────────────────────────────────────────────────────────────────

export async function uploadVendorDocument(vendorId: string, type: VendorDocumentType, file: File) {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  const { data } = await axiosAPI.post<Saved<VendorDocument>>(`/v1/vendors/${vendorId}/documents`, form, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export async function deleteVendorDocument(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/vendor-documents/${id}`);
  return data;
}

export async function checkVendorDocument(id: string) {
  const { data } = await axiosAPI.post<Saved<VendorDocument>>(`/v1/vendor-documents/${id}/check`);
  return data;
}

/** The private file, fetched with the caller's token and opened as a blob URL (revoke it after use). */
export async function openVendorDocument(id: string): Promise<string> {
  const response = await axiosAPI.get<Blob>(`/v1/vendor-documents/${id}/file`, { responseType: "blob" });
  return URL.createObjectURL(response.data);
}

// ── Members ───────────────────────────────────────────────────────────────────

export interface MemberPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  role: VendorMemberRole;
  shop_ids?: string[];
}

export async function getVendorMembers(vendorId: string) {
  const { data } = await axiosAPI.get<{ data: VendorMember[] }>(`/v1/vendors/${vendorId}/members`);
  return data.data;
}

export async function addVendorMember(vendorId: string, payload: MemberPayload) {
  const { data } = await axiosAPI.post<Saved<VendorMember>>(`/v1/vendors/${vendorId}/members`, payload);
  return data;
}

export async function updateVendorMember(vendorId: string, userId: string, payload: MemberPayload) {
  const { data } = await axiosAPI.put<Saved<VendorMember>>(`/v1/vendors/${vendorId}/members/${userId}`, payload);
  return data;
}

export async function removeVendorMember(vendorId: string, userId: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/vendors/${vendorId}/members/${userId}`);
  return data;
}

// ── Payout destinations ───────────────────────────────────────────────────────

export interface PayoutDestinationPayload {
  method: "Mobile Money" | "Bank";
  network?: "MTN" | "Airtel" | null;
  bank_name?: string | null;
  account_number: string;
  account_name: string;
}

export async function getPayoutBanks() {
  const { data } = await axiosAPI.get<{ data: PayoutBank[] }>("/v1/payout-banks");
  return data.data;
}

export async function addPayoutDestination(vendorId: string, payload: PayoutDestinationPayload) {
  const { data } = await axiosAPI.post<Saved<PayoutDestination>>(`/v1/vendors/${vendorId}/payout-destinations`, payload);
  return data;
}

export async function deletePayoutDestination(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/payout-destinations/${id}`);
  return data;
}

export async function decidePayoutDestination(id: string, decision: "approve" | "reject", reason?: string) {
  const { data } = await axiosAPI.post<Saved<PayoutDestination>>(`/v1/payout-destinations/${id}/${decision}`, reason ? { reason } : {});
  return data;
}

// ── Shops ─────────────────────────────────────────────────────────────────────

export interface ShopPayload {
  name?: string;
  slug?: string;
  shop_type?: string;
  description?: string | null;
  phone?: string;
  email?: string | null;
  payout_destination_id?: string | null;
}

export interface NewShopPayload extends Required<Pick<ShopPayload, "name" | "slug" | "shop_type" | "phone">> {
  description?: string | null;
  email?: string | null;
  location_address: string;
  location_area: string;
  location_opening_hours?: string | null;
}

export async function getShops(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<Shop>>("/v1/shops", { params: cleanParams(params) });
  return data;
}

export async function getShop(id: string) {
  const { data } = await axiosAPI.get<{ data: Shop }>(`/v1/shops/${id}`);
  return data.data;
}

export async function createShop(vendorId: string, payload: NewShopPayload) {
  const { data } = await axiosAPI.post<Saved<Shop>>(`/v1/vendors/${vendorId}/shops`, payload);
  return data;
}

export async function updateShop(id: string, payload: ShopPayload) {
  const { data } = await axiosAPI.put<Saved<Shop>>(`/v1/shops/${id}`, payload);
  return data;
}

export async function checkShopSlug(slug: string, ignoreShopId?: string) {
  const { data } = await axiosAPI.get<{ slug: string; available: boolean; message: string }>("/v1/shops/slug-availability", { params: cleanParams({ slug, ignore: ignoreShopId }) });
  return data;
}

export type ShopAction = "submit" | "close" | "approve" | "request-changes" | "reject" | "suspend" | "reinstate";

export async function actOnShop(id: string, action: ShopAction, reason?: string) {
  const { data } = await axiosAPI.post<Saved<Shop>>(`/v1/shops/${id}/${action}`, reason ? { reason } : {});
  return data;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export type LocationPayload = Pick<ShopLocation, "name" | "address" | "area"> & { phone?: string | null; opening_hours?: string | null; is_default?: boolean };

export async function addLocation(shopId: string, payload: LocationPayload) {
  const { data } = await axiosAPI.post<Saved<ShopLocation>>(`/v1/shops/${shopId}/locations`, payload);
  return data;
}

export async function updateLocation(shopId: string, id: string, payload: LocationPayload) {
  const { data } = await axiosAPI.put<Saved<ShopLocation>>(`/v1/shops/${shopId}/locations/${id}`, payload);
  return data;
}

export async function deleteLocation(shopId: string, id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/shops/${shopId}/locations/${id}`);
  return data;
}

// ── Platform settings ─────────────────────────────────────────────────────────

export async function getPlatformSettings() {
  const { data } = await axiosAPI.get<{ data: PlatformSettings }>("/v1/platform-settings");
  return data.data;
}

export async function updatePlatformSettings(payload: Partial<Omit<PlatformSettings, "updated_at">>) {
  const { data } = await axiosAPI.put<Saved<PlatformSettings>>("/v1/platform-settings", payload);
  return data;
}
