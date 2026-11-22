import axiosAPI from "../axiosApi";
import { cleanParams } from "../types/api";
import type { Paginated, ShopType } from "../types/kheengz";
import type {
  AttributeInputType,
  Category,
  CategoryRequest,
  Product,
  ProductAttribute,
  ProductPayload,
  ProductPhoto,
  ShopSection,
  ShopStockRow,
  StockCard,
  StockMovement,
  ManualStockReason,
  Unit,
} from "../types/catalogue";

/**
 * The catalogue: categories, attributes, units and category requests (the Admin's), a shop's sections,
 * products and photos. One function per endpoint of kheengz-laravel routes/api.php (docs/catalogue.md).
 */

type Params = Record<string, string | number | boolean | undefined | null>;
type Saved<T> = { message: string; data: T };
type Done = { message: string };
// The client sends JSON unless told otherwise; a request carrying files says so.
const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

// ── Categories ────────────────────────────────────────────────────────────────

/** The whole tree, flat, each straight after its parent. `active` for pickers. */
export async function getCategories(params: { active?: boolean } = {}) {
  const { data } = await axiosAPI.get<{ data: Category[] }>("/v1/categories", { params: params.active ? { active: 1 } : {} });
  return data.data;
}

export async function getCategory(id: string) {
  const { data } = await axiosAPI.get<{ data: Category }>(`/v1/categories/${id}`);
  return data.data;
}

export type CategoryInput = { name: string; parent_id: string | null; icon: string | null; is_active?: boolean; position?: number };

export async function createCategory(payload: CategoryInput) {
  const { data } = await axiosAPI.post<Saved<Category>>("/v1/categories", payload);
  return data;
}

export async function updateCategory(id: string, payload: Partial<CategoryInput>) {
  const { data } = await axiosAPI.put<Saved<Category>>(`/v1/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/categories/${id}`);
  return data;
}

/** Its own attributes, in order. */
export async function setCategoryAttributes(id: string, attributes: { id: string; is_required: boolean }[]) {
  const { data } = await axiosAPI.put<Saved<Category>>(`/v1/categories/${id}/attributes`, { attributes });
  return data;
}

// ── Attributes and units ──────────────────────────────────────────────────────

export async function getProductAttributes(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<ProductAttribute>>("/v1/product-attributes", { params: cleanParams(params) });
  return data;
}

export type AttributeInput = { name: string; input_type: AttributeInputType; unit: string | null; hint: string | null; options: { id: string | null; value: string }[] };

export async function createProductAttribute(payload: AttributeInput) {
  const { data } = await axiosAPI.post<Saved<ProductAttribute>>("/v1/product-attributes", payload);
  return data;
}

export async function updateProductAttribute(id: string, payload: Partial<AttributeInput>) {
  const { data } = await axiosAPI.put<Saved<ProductAttribute>>(`/v1/product-attributes/${id}`, payload);
  return data;
}

export async function deleteProductAttribute(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/product-attributes/${id}`);
  return data;
}

/** Every unit; with a shop type, that type's first (marked `suggested`). */
export async function getUnits(params: { active?: boolean; shop_type?: ShopType } = {}) {
  const { data } = await axiosAPI.get<{ data: Unit[] }>("/v1/units", { params: cleanParams({ active: params.active ? 1 : undefined, shop_type: params.shop_type }) });
  return data.data;
}

export type UnitInput = { name: string; plural: string; allows_decimals: boolean; is_active: boolean };

export async function createUnit(payload: UnitInput) {
  const { data } = await axiosAPI.post<Saved<Unit>>("/v1/units", payload);
  return data;
}

export async function updateUnit(id: string, payload: Partial<UnitInput>) {
  const { data } = await axiosAPI.put<Saved<Unit>>(`/v1/units/${id}`, payload);
  return data;
}

export async function deleteUnit(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/units/${id}`);
  return data;
}

// ── Category requests ─────────────────────────────────────────────────────────

export async function getCategoryRequests(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<CategoryRequest>>("/v1/category-requests", { params: cleanParams(params) });
  return data;
}

export async function requestCategory(shopId: string, payload: { name: string; parent_id: string | null; note: string | null }) {
  const { data } = await axiosAPI.post<Saved<CategoryRequest>>(`/v1/shops/${shopId}/category-requests`, payload);
  return data;
}

/** With an existing `category_id`, or a new one (`name`, `parent_id`, `icon`). */
export async function addRequestedCategory(id: string, payload: { category_id?: string | null; name?: string | null; parent_id?: string | null; icon?: string | null; answer?: string | null }) {
  const { data } = await axiosAPI.post<Saved<CategoryRequest>>(`/v1/category-requests/${id}/add`, payload);
  return data;
}

export async function declineCategoryRequest(id: string, answer: string) {
  const { data } = await axiosAPI.post<Saved<CategoryRequest>>(`/v1/category-requests/${id}/decline`, { answer });
  return data;
}

// ── Shop sections ─────────────────────────────────────────────────────────────

export async function getShopSections(shopId: string) {
  const { data } = await axiosAPI.get<{ data: ShopSection[] }>(`/v1/shops/${shopId}/sections`);
  return data.data;
}

/** Multipart when a photo comes with it (POST, with `_method=PUT` for an edit). */
function sectionForm(payload: { name?: string; is_active?: boolean; photo?: File | null; remove_photo?: boolean }, method?: "PUT") {
  const form = new FormData();
  if (method) form.append("_method", method);
  if (payload.name !== undefined) form.append("name", payload.name);
  if (payload.is_active !== undefined) form.append("is_active", payload.is_active ? "1" : "0");
  if (payload.photo) form.append("photo", payload.photo);
  if (payload.remove_photo) form.append("remove_photo", "1");
  return form;
}

export async function createShopSection(shopId: string, payload: { name: string; is_active?: boolean; photo?: File | null }) {
  const { data } = await axiosAPI.post<Saved<ShopSection>>(`/v1/shops/${shopId}/sections`, sectionForm(payload), MULTIPART);
  return data;
}

export async function updateShopSection(shopId: string, sectionId: string, payload: { name?: string; is_active?: boolean; photo?: File | null; remove_photo?: boolean }) {
  const { data } = await axiosAPI.post<Saved<ShopSection>>(`/v1/shops/${shopId}/sections/${sectionId}`, sectionForm(payload, "PUT"), MULTIPART);
  return data;
}

export async function deleteShopSection(shopId: string, sectionId: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/shops/${shopId}/sections/${sectionId}`);
  return data;
}

export async function reorderShopSections(shopId: string, ids: string[]) {
  const { data } = await axiosAPI.put<Saved<ShopSection[]>>(`/v1/shops/${shopId}/sections/order`, { ids });
  return data;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts(shopId: string, params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<Product>>(`/v1/shops/${shopId}/products`, { params: cleanParams(params) });
  return data;
}

export async function getProduct(id: string) {
  const { data } = await axiosAPI.get<{ data: Product }>(`/v1/products/${id}`);
  return data.data;
}

export async function createProduct(shopId: string, payload: ProductPayload) {
  const { data } = await axiosAPI.post<Saved<Product>>(`/v1/shops/${shopId}/products`, payload);
  return data;
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const { data } = await axiosAPI.put<Saved<Product>>(`/v1/products/${id}`, payload);
  return data;
}

export type ProductAction = "publish" | "hide" | "unblock";

export async function actOnProduct(id: string, action: ProductAction) {
  const { data } = await axiosAPI.post<Saved<Product>>(`/v1/products/${id}/${action}`);
  return data;
}

export async function blockProduct(id: string, reason: string) {
  const { data } = await axiosAPI.post<Saved<Product>>(`/v1/products/${id}/block`, { reason });
  return data;
}

export async function deleteProduct(id: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/products/${id}`);
  return data;
}

// ── Photos ────────────────────────────────────────────────────────────────────

export async function uploadProductPhotos(productId: string, files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("photos[]", file));
  const { data } = await axiosAPI.post<Saved<ProductPhoto[]>>(`/v1/products/${productId}/photos`, form, MULTIPART);
  return data;
}

export async function addProductPhotoFromLink(productId: string, url: string) {
  const { data } = await axiosAPI.post<Saved<ProductPhoto[]>>(`/v1/products/${productId}/photos`, { url });
  return data;
}

export async function reorderProductPhotos(productId: string, ids: string[]) {
  const { data } = await axiosAPI.put<{ data: ProductPhoto[] }>(`/v1/products/${productId}/photos/order`, { ids });
  return data.data;
}

export async function setPhotoVariant(productId: string, photoId: string, variantId: string | null) {
  const { data } = await axiosAPI.put<Saved<ProductPhoto>>(`/v1/products/${productId}/photos/${photoId}`, { product_variant_id: variantId });
  return data;
}

export async function deleteProductPhoto(productId: string, photoId: string) {
  const { data } = await axiosAPI.delete<Done>(`/v1/products/${productId}/photos/${photoId}`);
  return data;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export async function getStockCard(productId: string) {
  const { data } = await axiosAPI.get<{ data: StockCard }>(`/v1/products/${productId}/stock`);
  return data.data;
}

export type StockInput = { variant_id: string; location_id: string; reason: ManualStockReason; quantity: number; to_location_id?: string | null; note?: string | null };

export async function recordStock(productId: string, payload: StockInput) {
  const { data } = await axiosAPI.post<Saved<StockCard>>(`/v1/products/${productId}/stock`, payload);
  return data;
}

export async function getStockMovements(productId: string, params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<StockMovement>>(`/v1/products/${productId}/stock/movements`, { params: cleanParams(params) });
  return data;
}

export async function getShopStock(shopId: string, params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<ShopStockRow>>(`/v1/shops/${shopId}/stock`, { params: cleanParams(params) });
  return data;
}

// ── Bulk deletes and the paged Units screen ───────────────────────────────────

/** Ticked attributes, all or none (none when products use one of them). */
export async function deleteProductAttributes(ids: string[]) {
  const { data } = await axiosAPI.delete<Done>("/v1/product-attributes", { data: { ids } });
  return data;
}

/** Ticked units, all or none (none when products are sold by one of them). */
export async function deleteUnits(ids: string[]) {
  const { data } = await axiosAPI.delete<Done>("/v1/units", { data: { ids } });
  return data;
}

/** The Units screen, paged like every list (pickers use getUnits). */
export async function getUnitsPage(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<Unit>>("/v1/units", { params: cleanParams({ page: 1, ...params }) });
  return data;
}
