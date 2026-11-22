/**
 * The catalogue's shapes (kheengz-laravel docs/catalogue.md), mirroring CategoryResource,
 * ProductAttributeResource, UnitResource, CategoryRequestResource, ShopSectionResource, ProductResource
 * and ProductPhotoResource. Money is whole shillings; statuses are the Laravel enums' values.
 */
import type { Audited, ShopType, UserReference } from "./kheengz";

/** App\Enums\AttributeInputType. */
export type AttributeInputType = "List" | "Number" | "Text";
export const ATTRIBUTE_INPUT_TYPES: AttributeInputType[] = ["List", "Number", "Text"];

/** App\Enums\CategoryRequestStatus. */
export type CategoryRequestStatus = "Pending" | "Added" | "Declined";
export const CATEGORY_REQUEST_STATUSES: CategoryRequestStatus[] = ["Pending", "Added", "Declined"];

/** App\Enums\ProductStatus. */
export type ProductStatus = "Draft" | "Active" | "Hidden";
export const PRODUCT_STATUSES: ProductStatus[] = ["Draft", "Active", "Hidden"];

/** The API's limits (Product, ProductVariant, ShopSection, Category constants). */
export const LIMITS = { options: 3, variants: 100, photos: 10, priceBreaks: 5, sections: 30, categoryDepth: 4 } as const;

export interface AttributeOption {
  id: string;
  value: string;
  position: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  input_type: AttributeInputType;
  unit: string | null;
  hint: string | null;
  options?: AttributeOption[];
  categories_count?: number;
  /** On a category: needed before its products go on sale. */
  is_required?: boolean;
  /** In `effective_attributes`: the category it comes from (this one or a parent). */
  from_category_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  is_active: boolean;
  depth: number;
  /** "Household › Kitchen › Basins" */
  path: string;
  products_count?: number;
  children_count?: number;
  /** Its own attributes (with `is_required`). */
  attributes?: ProductAttribute[];
  /** Its parents' then its own: what its products are described by. */
  effective_attributes?: ProductAttribute[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Unit {
  id: string;
  name: string;
  plural: string;
  allows_decimals: boolean;
  position: number;
  is_active: boolean;
  /** Present when asked for a shop type: one that type sells by. */
  suggested?: boolean;
}

export interface CategoryRequest {
  id: string;
  shop_id: string;
  name: string;
  parent_id: string | null;
  note: string | null;
  status: CategoryRequestStatus;
  category_id: string | null;
  answer: string | null;
  decided_at: string | null;
  created_at: string;
  shop?: { id: string; name: string; shop_type: ShopType };
  parent?: { id: string; name: string; path: string } | null;
  category?: { id: string; name: string; path: string } | null;
  created_by?: UserReference | null;
  decided_by?: UserReference | null;
}

export interface ShopSection {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  position: number;
  is_active: boolean;
  products_count?: number;
}

export interface ProductPhoto {
  id: string;
  product_variant_id: string | null;
  url: string;
  thumb_url: string;
  width: number;
  height: number;
  size_bytes: number;
  position: number;
}

export interface PriceBreak {
  min_quantity: number;
  unit_price: number;
}

export interface ProductVariant {
  id: string;
  /** "Red / 20 L"; empty for the one variant of a product with no options. */
  label: string;
  option_values: string[];
  sku: string | null;
  barcode: string | null;
  unit_id: string;
  unit: Pick<Unit, "id" | "name" | "plural" | "allows_decimals">;
  price: number;
  compare_at_price: number | null;
  weight_grams: number | null;
  is_active: boolean;
  price_breaks: PriceBreak[];
}

export interface ProductOption {
  id: string;
  name: string;
  /** The category attribute it feeds, when its name matches one. */
  attribute_id: string | null;
  values: string[];
}

export interface ProductDetail {
  attribute_id: string;
  option_id: string | null;
  number: string | null;
  text: string | null;
  display: string | null;
}

export interface Product extends Audited {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  collect_only: boolean;
  published_at: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
  category?: { id: string; name: string; path: string; is_active: boolean };
  // In a list:
  cover?: ProductPhoto | null;
  min_price?: number | null;
  max_price?: number | null;
  variants_count?: number;
  photos_count?: number;
  // Opened:
  section_ids?: string[];
  sections?: { id: string; name: string }[];
  attributes?: ProductDetail[];
  options?: ProductOption[];
  variants?: ProductVariant[];
  photos?: ProductPhoto[];
  blocked_by?: UserReference | null;
}

/** What the product form sends (ProductController::rules). */
export interface ProductPayload {
  name: string;
  category_id: string;
  description: string | null;
  collect_only: boolean;
  section_ids: string[];
  attributes: { attribute_id: string; option_id?: string | null; number?: number | null; text?: string | null }[];
  options: { name: string; values: string[] }[];
  variants: {
    id: string | null;
    option_values: string[];
    sku: string | null;
    barcode: string | null;
    unit_id: string;
    price: number;
    compare_at_price: number | null;
    weight_grams: number | null;
    is_active: boolean;
    price_breaks: PriceBreak[];
  }[];
}
