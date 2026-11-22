"use client";

import React, { useDeferredValue, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppRouter } from "@/hooks/useAppRouter";
import { Field } from "@/components/dashboard/ui";
import PhoneField from "@/components/dashboard/forms/PhoneField";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { applyServerErrors, phone, requiredText } from "@/lib/validation";
import { checkShopSlug, createShop } from "@/services/vendors/vendors-service";
import { SHOP_TYPES, type Vendor } from "@/services/types/kheengz";
import { SHOPS_DOMAIN } from "@/lib/brand";
import { confirmSubmit, guardedClose } from "@/components/dashboard/ConfirmAction";

/** The address name rule the API enforces (ShopSlug): 3 to 40 small letters, digits and single hyphens. */
const SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$/;
const slugFrom = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const schema = z.object({
  name: requiredText("Enter the shop's name.", 2).max(120),
  slug: z.string().regex(SLUG, "Use 3 to 40 small letters, digits and hyphens, like homenest or home-nest."),
  shop_type: z.enum(SHOP_TYPES as [string, ...string[]], { error: "Choose what the shop sells." }),
  description: z.string().max(1000),
  phone: phone(true),
  location_address: requiredText("Say where the shop is, so riders and buyers can find it."),
  location_area: requiredText("Enter the area, like Kikuubo or Ntinda."),
  location_opening_hours: z.string().max(255),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "slug", "shop_type", "description", "phone", "location_address", "location_area", "location_opening_hours"] as const;

/**
 * Open a new shop (D31): saved as a Draft with its first location, then the shop's page opens to add a
 * payout destination and send it for review. The address name is checked as it is typed.
 */
export default function NewShopDialog({ vendor, visible, onHide }: { vendor: Vendor; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const { control, handleSubmit, reset, setError, setValue, formState: { errors , isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "", shop_type: "", description: "", phone: "", location_address: "", location_area: "", location_opening_hours: "" } });
  const name = useWatch({ control, name: "name" });
  const slug = useWatch({ control, name: "slug" });
  const typedSlug = useDeferredValue(slug ?? "");

  useResetOnOpen(visible, vendor.id, () => {
    setFormError(null);
    setSlugTouched(false);
  });
  useEffect(() => {
    if (visible) reset({ name: "", slug: "", shop_type: "", description: "", phone: vendor.phone, location_address: "", location_area: "", location_opening_hours: "" });
  }, [visible, reset, vendor.phone]);

  // The address name follows the shop name until the vendor edits it themselves.
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugFrom(name ?? ""));
  }, [name, slugTouched, setValue]);

  const availability = useQuery({
    queryKey: ["shop-slug", typedSlug],
    queryFn: () => checkShopSlug(typedSlug),
    enabled: visible && SLUG.test(typedSlug),
    staleTime: 30_000,
    meta: { skipGlobalError: true },
  });

  const save = useMutation({
    mutationFn: (v: Values) => createShop(vendor.id, { ...v, description: v.description || null, location_opening_hours: v.location_opening_hours || null }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["shops"] }), queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] })]);
      toast.success(response.message);
      onHide();
      router.push(`/dashboard/shops/${response.data.id}`);
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS)),
  });

  const slugHint = availability.data && availability.data.slug === typedSlug ? availability.data.message : `Buyers find it at ${typedSlug || "yourshop"}.${SHOPS_DOMAIN}`;

  const close = guardedClose(isDirty, save.isPending, onHide);

  return (
    <Dialog maximizable header="Open a shop" visible={visible} onHide={close} style={{ width: "min(40rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); confirmSubmit("this shop", () => save.mutateAsync(v)); })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" required error={errors.name?.message}>
            <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" placeholder="Home Nest" invalid={!!errors.name} />} />
          </Field>
          <Field label="What it sells" required error={errors.shop_type?.message} hint="Sets the shop's layout and how products are described.">
            <Controller control={control} name="shop_type" render={({ field }) => <Dropdown value={field.value} options={SHOP_TYPES} onChange={(e) => field.onChange(e.value)} placeholder="Choose a type" className="w-full" invalid={!!errors.shop_type} />} />
          </Field>
        </div>
        <Field
          label="Web address"
          required
          error={errors.slug?.message ?? (availability.data && availability.data.slug === typedSlug && !availability.data.available ? availability.data.message : undefined)}
          hint={slugHint}
        >
          <div className="p-inputgroup">
            <Controller control={control} name="slug" render={({ field }) => (
              <InputText {...field} onChange={(e) => { setSlugTouched(true); field.onChange(e.target.value.toLowerCase()); }} className="w-full" invalid={!!errors.slug} />
            )} />
            <span className="p-inputgroup-addon">.{SHOPS_DOMAIN}</span>
          </div>
        </Field>
        <Field label="Description" error={errors.description?.message} hint="Optional. What buyers should know: what you sell, wholesale or retail.">
          <Controller control={control} name="description" render={({ field }) => <InputTextarea {...field} rows={2} autoResize className="w-full" />} />
        </Field>
        <Field label="Shop phone" required error={errors.phone?.message} hint="Shown to buyers; approvals are texted here.">
          <Controller control={control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />} />
        </Field>
        <fieldset className="space-y-4 rounded-xl border border-(--border-color) p-4">
          <legend className="px-1 text-sm font-semibold text-(--text-primary)">Where the shop is</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" required error={errors.location_address?.message}>
              <Controller control={control} name="location_address" render={({ field }) => <InputText {...field} className="w-full" placeholder="Plot 12, Kikuubo Lane" invalid={!!errors.location_address} />} />
            </Field>
            <Field label="Area" required error={errors.location_area?.message}>
              <Controller control={control} name="location_area" render={({ field }) => <InputText {...field} className="w-full" placeholder="Kikuubo" invalid={!!errors.location_area} />} />
            </Field>
          </div>
          <Field label="Opening hours" error={errors.location_opening_hours?.message} hint="Optional, as you would say it.">
            <Controller control={control} name="location_opening_hours" render={({ field }) => <InputText {...field} className="w-full" placeholder="Mon to Sat, 8am to 7pm" />} />
          </Field>
        </fieldset>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={close} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save as draft" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
