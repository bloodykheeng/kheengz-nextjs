"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "primereact/button";
import { Chips } from "primereact/chips";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { MultiSelect } from "primereact/multiselect";
import type { AxiosError } from "axios";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, Field, SwitchRow } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import CategoryPicker from "@/components/dashboard/catalogue/CategoryPicker";
import RequestCategoryDialog from "@/components/dashboard/catalogue/RequestCategoryDialog";
import SectionsDialog from "@/components/dashboard/catalogue/SectionsDialog";
import { blankVariant, variantsFor, type OptionValues, type VariantValues } from "@/components/dashboard/catalogue/variants";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { ugx } from "@/lib/format";
import { ALWAYS, requiredText, type ApiErrorBody } from "@/lib/validation";
import { getCategories, getCategory, getShopSections, getUnits } from "@/services/catalogue/catalogue-service";
import { LIMITS, type Product, type ProductAttribute, type ProductPayload, type Unit } from "@/services/types/catalogue";
import type { Shop } from "@/services/types/kheengz";

const money = (label: string) => z.number({ error: label }).nullable();

const schema = z.object({
  name: requiredText("Enter the product's name.", 2).max(150),
  category_id: z.string().min(1, "Choose the category buyers will find it under."),
  description: z.string().max(5000),
  collect_only: z.boolean(),
  section_ids: z.array(z.string()),
  // Only the part that fits the attribute is set (a choice, a number or text); the others stay unset.
  details: z.record(z.string(), z.object({ option_id: z.string().nullable().optional(), number: z.number().nullable().optional(), text: z.string().max(120).optional() })),
  options: z.array(z.object({ name: z.string().trim().max(40), values: z.array(z.string().trim().min(1).max(60)) })).max(LIMITS.options),
  variants: z.array(z.object({
    id: z.string().nullable(),
    option_values: z.array(z.string()),
    price: money("Set a price."),
    compare_at_price: money("Enter the was-price, or leave it empty."),
    sku: z.string().max(60),
    barcode: z.string().max(60).regex(/^[0-9A-Za-z-]*$/, "Use the digits and letters printed under the bars."),
    unit_id: z.string(),
    weight_grams: z.number().nullable(),
    is_active: z.boolean(),
    price_breaks: z.array(z.object({ min_quantity: z.number().nullable(), unit_price: z.number().nullable() })).max(LIMITS.priceBreaks),
  })).min(1).max(LIMITS.variants, `A product can have ${LIMITS.variants} variants. Split it into two products.`),
}).superRefine((v, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  const names = new Set<string>();
  v.options.forEach((o, i) => {
    if (!o.name) issue(["options", i, "name"], "Name the option, like Size or Colour.");
    else if (names.has(o.name.toLowerCase())) issue(["options", i, "name"], "Two options have this name.");
    names.add(o.name.toLowerCase());
    if (o.values.length === 0) issue(["options", i, "values"], "Add its values, like 10 L and 20 L.");
  });
  const skus = new Set<string>();
  v.variants.forEach((variant, i) => {
    if (variant.price === null || variant.price < 1) issue(["variants", i, "price"], "Set a price.");
    if (!variant.unit_id) issue(["variants", i, "unit_id"], "Choose how it is sold.");
    if (variant.compare_at_price !== null && variant.price !== null && variant.compare_at_price <= variant.price) issue(["variants", i, "compare_at_price"], "The was-price must be above the price.");
    const sku = variant.sku.trim().toLowerCase();
    if (sku && skus.has(sku)) issue(["variants", i, "sku"], "Two variants have this SKU.");
    if (sku) skus.add(sku);
    let last = variant.price ?? Infinity;
    [...variant.price_breaks].sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0)).forEach((b) => {
      if (b.min_quantity === null || b.unit_price === null) return issue(["variants", i, "price_breaks"], "Fill in each price break, or remove it.");
      if (b.min_quantity < 2) return issue(["variants", i, "price_breaks"], "A price break starts at 2 or more.");
      if (b.unit_price >= last) return issue(["variants", i, "price_breaks"], "Each price break must cost less than the one before it, and less than the price.");
      last = b.unit_price;
    });
  });
}, ALWAYS);

export type ProductFormValues = z.infer<typeof schema>;

/** The form's starting values: a blank product, or the saved one in the form's shape. */
export function productFormValues(product: Product | null, defaultUnitId = ""): ProductFormValues {
  const details: ProductFormValues["details"] = {};
  for (const d of product?.attributes ?? []) {
    details[d.attribute_id] = { option_id: d.option_id, number: d.number === null ? null : Number(d.number), text: d.text ?? "" };
  }
  const variants: VariantValues[] = (product?.variants ?? []).map((v) => ({
    id: v.id,
    option_values: v.option_values,
    price: v.price,
    compare_at_price: v.compare_at_price,
    sku: v.sku ?? "",
    barcode: v.barcode ?? "",
    unit_id: v.unit_id,
    weight_grams: v.weight_grams,
    is_active: v.is_active,
    price_breaks: v.price_breaks.map((b) => ({ min_quantity: b.min_quantity, unit_price: b.unit_price })),
  }));
  return {
    name: product?.name ?? "",
    category_id: product?.category_id ?? "",
    description: product?.description ?? "",
    collect_only: product?.collect_only ?? false,
    section_ids: product?.section_ids ?? [],
    details,
    options: (product?.options ?? []).map((o) => ({ name: o.name, values: o.values })),
    variants: variants.length ? variants : [blankVariant(defaultUnitId)],
  };
}

/** The form as the API takes it (ProductController::rules). */
function payloadFrom(v: ProductFormValues, attributes: ProductAttribute[]): ProductPayload {
  const hasOptions = v.options.length > 0;
  return {
    name: v.name.trim(),
    category_id: v.category_id,
    description: v.description.trim() || null,
    collect_only: v.collect_only,
    section_ids: v.section_ids,
    attributes: attributes
      .map((a) => ({ a, d: v.details[a.id] }))
      .filter(({ a, d }) => d && (a.input_type === "List" ? !!d.option_id : a.input_type === "Number" ? d.number != null : !!d.text?.trim()))
      .map(({ a, d }) => ({ attribute_id: a.id, option_id: a.input_type === "List" ? (d.option_id ?? null) : null, number: a.input_type === "Number" ? (d.number ?? null) : null, text: a.input_type === "Text" ? (d.text ?? "").trim() : null })),
    options: v.options.map((o) => ({ name: o.name.trim(), values: o.values })),
    variants: (hasOptions ? v.variants : v.variants.slice(0, 1)).map((variant) => ({
      id: variant.id,
      option_values: hasOptions ? variant.option_values : [],
      sku: variant.sku.trim() || null,
      barcode: variant.barcode.trim() || null,
      unit_id: variant.unit_id,
      price: variant.price ?? 0,
      compare_at_price: variant.compare_at_price,
      weight_grams: variant.weight_grams,
      is_active: variant.is_active,
      price_breaks: variant.price_breaks.filter((b) => b.min_quantity !== null && b.unit_price !== null).map((b) => ({ min_quantity: b.min_quantity!, unit_price: b.unit_price! })),
    })),
  };
}

/** Field paths the form can show an API error under; anything else goes in the summary. */
const PLACEABLE = /^(name|category_id|description|section_ids|options\.\d+\.(name|values)|variants\.\d+\.(price|compare_at_price|sku|barcode|unit_id|weight_grams|price_breaks|option_values))$/;

/** A 422 onto the form: each message under its field, the rest returned for the summary. */
export function placeServerErrors(error: unknown, setError: UseFormSetError<ProductFormValues>): string[] {
  const body = (error as AxiosError<ApiErrorBody>)?.response?.data;
  if (!body) return ["Could not reach the server. Check your connection and try again."];
  const rest: string[] = [];
  for (const [key, messages] of Object.entries(body.errors ?? {})) {
    if (PLACEABLE.test(key)) setError(key as never, { type: "server", message: messages[0] });
    else rest.push(messages[0]);
  }
  if (!body.errors) rest.push(body.message ?? "Something went wrong. Try again.");
  return rest;
}

/**
 * The product form (D32, D17): what it is and where buyers find it, its category's details, its own
 * options and every variant's price, unit and price breaks. Sent whole; the API keeps variant ids
 * across edits. `aside` holds the photos and status of a saved product.
 */
export default function ProductForm({ shop, product, saving, onSubmit, aside, readOnly = false }: {
  shop: Shop;
  product: Product | null;
  saving: boolean;
  /** Seen, not changed (a reviewer, a closed shop): the fields are off and there is no save bar. */
  readOnly?: boolean;
  onSubmit: (payload: ProductPayload, setError: UseFormSetError<ProductFormValues>, reset: (values: ProductFormValues) => void) => void;
  aside?: React.ReactNode;
}) {
  const units = useQuery({ queryKey: ["units", "active", shop.shop_type], queryFn: () => getUnits({ active: true, shop_type: shop.shop_type }) });
  const tree = useQuery({ queryKey: ["categories", "active"], queryFn: () => getCategories({ active: true }) });
  const sections = useQuery({ queryKey: ["shop-sections", shop.id], queryFn: () => getShopSections(shop.id) });
  const defaultUnitId = units.data?.[0]?.id ?? "";

  const form = useForm<ProductFormValues>({ resolver: zodResolver(schema), defaultValues: productFormValues(product, defaultUnitId) });
  const { control, handleSubmit, reset, setError, getValues, formState: { errors, dirtyFields } } = form;
  // What the person changed, not what the form registered (a category detail appearing is no edit).
  const isDirty = Object.keys(dirtyFields).length > 0;
  const variantsArray = useFieldArray({ control, name: "variants", keyName: "key" });
  const optionsArray = useFieldArray({ control, name: "options", keyName: "key" });
  const options = useWatch({ control, name: "options" });
  const categoryId = useWatch({ control, name: "category_id" });
  const [asking, setAsking] = useState(false);
  const [managingSections, setManagingSections] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);
  const formId = `product-form-${product?.id ?? "new"}`;

  // Seeded when the product opens or switches, never on a refetch (dashboard-patterns §4).
  useResetOnOpen(true, product?.id ?? "new", () => setSummary([]));
  useEffect(() => {
    if (!units.data || isDirty) return;
    // A new product waits for the units to pick its default one.
    if (!product && !getValues("variants.0.unit_id")) reset(productFormValues(null, units.data[0]?.id ?? ""));
  }, [units.data, product, isDirty, getValues, reset]);

  // Reloading or closing the tab with unsaved changes asks first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const category = useQuery({ queryKey: ["category", categoryId], queryFn: () => getCategory(categoryId), enabled: !!categoryId });
  const attributes = useMemo(() => category.data?.effective_attributes ?? [], [category.data]);
  const listAttributes = attributes.filter((a) => a.input_type === "List");

  /** Options changed: rebuild the variants, keeping what was typed into the ones that stay. */
  const changeOptions = (next: OptionValues[]) => {
    optionsArray.replace(next);
    variantsArray.replace(variantsFor(next, getValues("variants"), defaultUnitId));
  };

  const submit = handleSubmit(
    (v) => {
      setSummary([]);
      onSubmit(payloadFrom(v, attributes), (name, error) => {
        setError(name, error);
      }, (values) => reset(values));
    },
    // Every problem listed, so one under a folded variant is never missed.
    (invalid) => setSummary(["Fix these to save:", ...new Set(messagesOf(invalid))]),
  );

  const hasOptions = options.length > 0;
  const unitOptions = (units.data ?? []).map((u: Unit) => ({ label: u.suggested ? `${u.name} (common for your shop)` : u.name, value: u.id }));

  return (
    <>
    {/* The form holds the main column only. The side column's photos and status have forms and
        dialogs of their own, and a form inside a form also submits the outer one. Its "In your shop"
        fields are still this form's (react-hook-form keeps them), and the save bar names the form. */}
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form id={formId} noValidate onSubmit={submit} className="min-w-0">
        <fieldset disabled={readOnly} className="min-w-0 space-y-5">
          <Card title="What it is">
            <div className="space-y-4">
              <Field label="Name" required error={errors.name?.message} hint="What a buyer would type to find it: Round basin, 20 litres.">
                <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.name} />} />
              </Field>
              <Field label="Category" required error={errors.category_id?.message} hint={
                <>Where buyers find it across the marketplace. Choose the most specific one. <button type="button" className="font-medium text-(--brand-ink) underline" onClick={() => setAsking(true)}>No category fits? Ask for one.</button></>
              }>
                <Controller control={control} name="category_id" render={({ field }) => (
                  <CategoryPicker categories={tree.data ?? []} value={field.value || null} onChange={(id) => field.onChange(id ?? "")} invalid={!!errors.category_id} />
                )} />
              </Field>
              <Field label="Description" error={errors.description?.message} hint="What it is made of, sizes, what it is good for. Short lines read best on a phone.">
                <Controller control={control} name="description" render={({ field }) => <InputTextarea {...field} rows={4} autoResize className="w-full" />} />
              </Field>
            </div>
          </Card>

          {categoryId && (
            <Card title="Details buyers filter by">
              {category.isPending ? (
                <div className="h-20 animate-pulse rounded-lg bg-(--border-color)/40" role="status" aria-label="Loading" />
              ) : attributes.length === 0 ? (
                <p className="text-sm text-(--text-muted)">This category has no details to fill in.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {attributes.map((a) => <DetailField key={a.id} attribute={a} control={control} />)}
                </div>
              )}
            </Card>
          )}

          <Card title="Price and variants" actions={
            !hasOptions && <Button type="button" size="small" outlined icon="pi pi-plus" label="Add options" onClick={() => changeOptions([{ name: listAttributes[0]?.name ?? "Size", values: [] }])} />
          }>
            {hasOptions ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  {optionsArray.fields.map((o, i) => (
                    <div key={o.key} className="grid gap-3 rounded-xl border border-(--border-color) p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
                      <Field label="Option" error={errors.options?.[i]?.name?.message} hint={listAttributes.some((a) => a.name.toLowerCase() === options[i]?.name.trim().toLowerCase()) ? "Also used in the category's filter." : undefined}>
                        <InputText value={options[i]?.name ?? ""} list={`option-names-${i}`} className="w-full" placeholder="Size"
                          onChange={(e) => changeOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} invalid={!!errors.options?.[i]?.name} />
                        <datalist id={`option-names-${i}`}>
                          {[...new Set([...listAttributes.map((a) => a.name), "Size", "Colour", "Scent", "Pack"])].map((n) => <option key={n} value={n} />)}
                        </datalist>
                      </Field>
                      <Field label="Values" error={errors.options?.[i]?.values?.message} hint="Type one and press Enter.">
                        <Chips value={options[i]?.values ?? []} separator="," className="w-full" pt={{ container: { className: "w-full" } }} invalid={!!errors.options?.[i]?.values}
                          onChange={(e) => {
                            const values = Array.from(new Set((e.value ?? []).map((v: string) => v.trim()).filter(Boolean)));
                            changeOptions(options.map((x, j) => (j === i ? { ...x, values } : x)));
                          }} />
                      </Field>
                      <div className="flex items-end">
                        <Button type="button" text severity="danger" icon="pi pi-trash" aria-label={`Remove ${options[i]?.name || "this option"}`}
                          onClick={() => changeOptions(options.filter((_, j) => j !== i))} />
                      </div>
                    </div>
                  ))}
                  {options.length < LIMITS.options && (
                    <Button type="button" size="small" text icon="pi pi-plus" label="Another option" onClick={() => changeOptions([...options, { name: "", values: [] }])} />
                  )}
                </div>
                <VariantsTable control={control} errors={errors} fields={variantsArray.fields} unitOptions={unitOptions}
                  setAllPrices={(price) => getValues("variants").forEach((_, i) => form.setValue(`variants.${i}.price`, price, { shouldDirty: true }))} />
              </div>
            ) : (
              <VariantFields index={0} control={control} errors={errors} unitOptions={unitOptions} />
            )}
          </Card>
        </fieldset>
        </form>

        {/* On a phone the photos and status come first: they decide whether it can go on sale. */}
        <div className="order-first min-w-0 space-y-5 xl:order-none">
          {aside}
          <fieldset disabled={readOnly}>
          <Card title="In your shop">
            <div className="space-y-4">
              <Field label="Shop sections" hint={<>Your own groups, like Back to school. <button type="button" className="font-medium text-(--brand-ink) underline" onClick={() => setManagingSections(true)}>Manage sections</button></>}>
                <Controller control={control} name="section_ids" render={({ field }) => (
                  <MultiSelect value={field.value} onChange={(e) => field.onChange(e.value)} options={(sections.data ?? []).map((s) => ({ label: s.name, value: s.id }))}
                    placeholder={(sections.data ?? []).length ? "None" : "No sections yet"} display="chip" className="w-full" />
                )} />
              </Field>
              <Controller control={control} name="collect_only" render={({ field }) => (
                <SwitchRow label="Collected at the shop only" hint="Too big or fragile for a boda. Buyers see it cannot be delivered." checked={field.value} onChange={field.onChange} />
              )} />
            </div>
          </Card>
          </fieldset>
        </div>
      </div>

      {summary.length > 0 && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {summary[0] === "Fix these to save:" ? (
            <>
              <p className="font-medium">{summary[0]}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">{summary.slice(1).map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          ) : <ul className="list-disc space-y-1 pl-5">{summary.map((m) => <li key={m}>{m}</li>)}</ul>}
        </div>
      )}

      {/* Stays in view at the foot of the page while scrolling a long product. */}
      {!readOnly && <div className="sticky bottom-0 z-20 -mx-4 border-t border-(--border-color) bg-(--bg-card)/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isDirty && <span className="mr-auto text-sm text-(--text-muted)">Unsaved changes</span>}
          {!product && <Link href={`/dashboard/shops/${shop.id}/products`} className="p-button p-button-text">Cancel</Link>}
          {product && isDirty && (
            <Button type="button" text label="Discard" disabled={saving} onClick={() => confirmAction({
              header: "Discard your changes?",
              message: "The product goes back to how it was last saved.",
              acceptLabel: "Discard",
              danger: true,
              accept: async () => reset(productFormValues(product, defaultUnitId)),
            })} />
          )}
          <Button type="submit" form={formId} icon="pi pi-check" label={product ? "Save changes" : "Save as draft"} loading={saving} disabled={!!product && !isDirty} />
        </div>
      </div>}

    </div>
    {/* Outside the form: each dialog has its own form, and forms do not nest. */}
    <RequestCategoryDialog shopId={shop.id} categories={tree.data ?? []} visible={asking} onHide={() => setAsking(false)} />
    <SectionsDialog shopId={shop.id} visible={managingSections} onHide={() => setManagingSections(false)} />
    </>
  );
}

/** Every message in react-hook-form's nested errors, in form order. */
function messagesOf(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];
  const own = typeof (errors as { message?: unknown }).message === "string" ? [(errors as { message: string }).message] : [];
  return [...own, ...Object.entries(errors).filter(([k]) => k !== "ref" && k !== "message" && k !== "type").flatMap(([, v]) => messagesOf(v))];
}

/** One of the category's details, entered the attribute's way. */
function DetailField({ attribute: a, control }: { attribute: ProductAttribute; control: Control<ProductFormValues> }) {
  const label = a.name;
  const hint = [a.hint, a.is_required ? "Needed to put it on sale." : null].filter(Boolean).join(" ");
  return (
    <Field label={label} required={a.is_required} hint={hint || undefined}>
      {a.input_type === "List" ? (
        <Controller control={control} name={`details.${a.id}.option_id`} render={({ field }) => (
          <Dropdown value={field.value ?? null} options={(a.options ?? []).map((o) => ({ label: o.value, value: o.id }))} onChange={(e) => field.onChange(e.value ?? null)}
            placeholder="Choose" showClear filter={(a.options ?? []).length > 8} className="w-full" />
        )} />
      ) : a.input_type === "Number" ? (
        <Controller control={control} name={`details.${a.id}.number`} render={({ field }) => (
          <InputNumber value={field.value ?? null} onValueChange={(e) => field.onChange(e.value ?? null)} suffix={a.unit ? ` ${a.unit}` : undefined} maxFractionDigits={3} min={0} className="w-full" inputClassName="w-full" />
        )} />
      ) : (
        <Controller control={control} name={`details.${a.id}.text`} render={({ field }) => <InputText value={field.value ?? ""} onChange={field.onChange} className="w-full" maxLength={120} />} />
      )}
    </Field>
  );
}

type UnitOption = { label: string; value: string };

/** Price, was-price, unit, SKU, barcode, weight and price breaks of one variant. */
function VariantFields({ index: i, control, errors, unitOptions }: { index: number; control: Control<ProductFormValues>; errors: FieldErrors<ProductFormValues>; unitOptions: UnitOption[] }) {
  const e = errors.variants?.[i];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" required error={e?.price?.message} hint="Per unit, what the buyer pays.">
          <Controller control={control} name={`variants.${i}.price`} render={({ field }) => (
            <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" invalid={!!e?.price} />
          )} />
        </Field>
        <Field label="Was" error={e?.compare_at_price?.message} hint="Optional: shown crossed out.">
          <Controller control={control} name={`variants.${i}.compare_at_price`} render={({ field }) => (
            <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" invalid={!!e?.compare_at_price} />
          )} />
        </Field>
        <Field label="Sold by" required error={e?.unit_id?.message}>
          <Controller control={control} name={`variants.${i}.unit_id`} render={({ field }) => (
            <Dropdown value={field.value || null} options={unitOptions} onChange={(ev) => field.onChange(ev.value)} placeholder="Choose" className="w-full" invalid={!!e?.unit_id} />
          )} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="SKU" error={e?.sku?.message} hint="Your own code. Optional.">
          <Controller control={control} name={`variants.${i}.sku`} render={({ field }) => <InputText {...field} className="w-full" invalid={!!e?.sku} />} />
        </Field>
        <Field label="Barcode" error={e?.barcode?.message} hint="As printed. Optional.">
          <Controller control={control} name={`variants.${i}.barcode`} render={({ field }) => <InputText {...field} inputMode="numeric" className="w-full" invalid={!!e?.barcode} />} />
        </Field>
        <Field label="Weight" error={e?.weight_grams?.message} hint="Per unit, for delivery. Optional.">
          <Controller control={control} name={`variants.${i}.weight_grams`} render={({ field }) => (
            <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} suffix=" g" min={0} className="w-full" inputClassName="w-full" />
          )} />
        </Field>
      </div>
      <PriceBreaks index={i} control={control} error={e?.price_breaks?.message ?? e?.price_breaks?.root?.message} />
    </div>
  );
}

/** Wholesale (D17): "12 or more: UGX 4,500 each". */
function PriceBreaks({ index: i, control, error }: { index: number; control: Control<ProductFormValues>; error?: string }) {
  const breaks = useFieldArray({ control, name: `variants.${i}.price_breaks`, keyName: "key" });
  const price = useWatch({ control, name: `variants.${i}.price` });
  return (
    <fieldset className="rounded-xl border border-dashed border-(--border-color) p-3">
      <legend className="px-1 text-sm font-medium text-(--text-primary)">Wholesale prices</legend>
      {breaks.fields.length === 0 ? (
        <p className="text-xs text-(--text-muted)">Cheaper when buying more, like 12 or more at a lower price each. Optional.</p>
      ) : (
        <ul className="space-y-2">
          {breaks.fields.map((b, j) => (
            <li key={b.key} className="flex flex-wrap items-center gap-2 text-sm">
              <Controller control={control} name={`variants.${i}.price_breaks.${j}.min_quantity`} render={({ field }) => (
                <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} min={2} maxFractionDigits={3} placeholder="12" aria-label="From this many" inputClassName="w-20" />
              )} />
              <span>or more:</span>
              <Controller control={control} name={`variants.${i}.price_breaks.${j}.unit_price`} render={({ field }) => (
                <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} prefix="UGX " min={0} placeholder={price ? ugx(Math.round(price * 0.9)) : undefined} aria-label="Price each" inputClassName="w-32" />
              )} />
              <span>each</span>
              <Button type="button" text size="small" severity="danger" icon="pi pi-times" aria-label="Remove this price" onClick={() => breaks.remove(j)} />
            </li>
          ))}
        </ul>
      )}
      {error && <small className="mt-2 block text-xs text-red-500">{error}</small>}
      {breaks.fields.length < LIMITS.priceBreaks && (
        <Button type="button" text size="small" icon="pi pi-plus" label="Add a wholesale price" className="mt-1" onClick={() => breaks.append({ min_quantity: null, unit_price: null })} />
      )}
    </fieldset>
  );
}

/** Every combination of the options, each with its own price; more opens the rest of its fields. */
function VariantsTable({ control, errors, fields, unitOptions, setAllPrices }: {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  fields: { key: string; option_values: string[] }[];
  unitOptions: UnitOption[];
  setAllPrices: (price: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [bulk, setBulk] = useState<number | null>(null);
  if (fields.length === 0) return <p className="text-sm text-(--text-muted)">Add values to the options to make the variants.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-(--text-primary)">{fields.length} variant{fields.length === 1 ? "" : "s"}</p>
        <span className="flex items-center gap-2">
          <InputNumber value={bulk} onValueChange={(e) => setBulk(e.value ?? null)} prefix="UGX " min={0} placeholder="One price for all" aria-label="One price for all variants" inputClassName="w-40" />
          <Button type="button" size="small" outlined label="Apply" onClick={() => bulk && setAllPrices(bulk)} />
        </span>
      </div>
      <ul className="divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
        {fields.map((f, i) => {
          const e = errors.variants?.[i];
          const expanded = open === f.key || !!(e?.sku || e?.barcode || e?.price_breaks || e?.compare_at_price || e?.unit_id);
          return (
            <li key={f.key} className="space-y-3 px-3 py-3">
              <div className="flex flex-wrap items-start gap-3">
                <span className="min-w-[8rem] flex-1 pt-2 text-sm font-medium text-(--text-primary)">{f.option_values.join(" / ")}</span>
                <Field label="Price" error={e?.price?.message} className="w-40">
                  <Controller control={control} name={`variants.${i}.price`} render={({ field }) => (
                    <InputNumber value={field.value ?? null} onValueChange={(ev) => field.onChange(ev.value ?? null)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" invalid={!!e?.price} />
                  )} />
                </Field>
                <Controller control={control} name={`variants.${i}.is_active`} render={({ field }) => (
                  <label className="flex items-center gap-2 pt-7 text-sm text-(--text-secondary)">
                    <InputSwitch checked={field.value} onChange={(ev) => field.onChange(!!ev.value)} /> Offered
                  </label>
                )} />
                <Button type="button" text size="small" className="mt-6" icon={`pi ${expanded ? "pi-chevron-up" : "pi-chevron-down"}`} label={expanded ? "Less" : "More"}
                  aria-expanded={expanded} onClick={() => setOpen(expanded ? null : f.key)} />
              </div>
              {expanded && <VariantFields index={i} control={control} errors={errors} unitOptions={unitOptions} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
