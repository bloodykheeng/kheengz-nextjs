"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, Field, PageHeader, StatusTag } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import PhoneField from "@/components/dashboard/forms/PhoneField";
import { ReasonDialog } from "@/components/dashboard/vendors/PayoutDestinationsCard";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { dateTime } from "@/lib/format";
import { ugandanLocal } from "@/lib/phone";
import { applyServerErrors, phone, requiredText } from "@/lib/validation";
import {
  actOnShop,
  addLocation,
  deleteLocation,
  getShop,
  getVendor,
  updateLocation,
  updateShop,
  type ShopAction,
} from "@/services/vendors/vendors-service";
import type { Shop, ShopLocation, Vendor } from "@/services/types/kheengz";

const EDITABLE = new Set(["Draft", "Changes requested", "Active"]);

/**
 * One shop (D31): its details, where it is paid, its locations and its history. The vendor's people
 * edit it (not while it waits for review); the Owner chooses where it is paid, sends it for review and
 * closes it; a reviewer approves, asks for changes, rejects, suspends or reinstates it.
 */
export default function ShopWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const shopQuery = useQuery({ queryKey: ["shop", id], queryFn: () => getShop(id) });
  const shop = shopQuery.data;
  const vendorQuery = useQuery({ queryKey: ["vendor", shop?.vendor_id], queryFn: () => getVendor(shop!.vendor_id), enabled: !!shop });
  useBreadcrumbTitle(shop?.name);

  if (shopQuery.isPending || vendorQuery.isPending || !shop || !vendorQuery.data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-(--bg-card)" role="status" aria-label="Loading" />;
  }

  const vendor = vendorQuery.data;
  const reviewer = can("manage vendors");
  const isOwner = vendor.my_role === "Owner";
  const canEdit = can("run shops") && !!vendor.my_role && EDITABLE.has(shop.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{shop.name} <StatusTag status={shop.status} raw /></span>}
        subtitle={
          <>
            {shop.address} · {shop.shop_type} · by{" "}
            {can("view vendors") ? <Link href={`/dashboard/vendors/${vendor.id}`} className="font-medium text-(--brand-ink) hover:underline">{vendor.name}</Link> : vendor.name}
          </>
        }
        actions={<ShopActions shop={shop} vendor={vendor} isOwner={isOwner} reviewer={reviewer} />}
      />
      {shop.status_reason && ["Changes requested", "Rejected", "Suspended", "Closed"].includes(shop.status) && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {shop.status}: {shop.status_reason}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <ShopDetailsCard shop={shop} editable={canEdit} />
        <PayoutCard shop={shop} vendor={vendor} isOwner={isOwner} canEdit={canEdit} />
        <LocationsCard shop={shop} editable={canEdit} />
        <HistoryCard shop={shop} />
      </div>
    </div>
  );
}

function ShopActions({ shop, vendor, isOwner, reviewer }: { shop: Shop; vendor: Vendor; isOwner: boolean; reviewer: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<null | { action: ShopAction; header: string; label: string }>(null);
  const act = useMutation({
    mutationFn: ({ action, reason }: { action: ShopAction; reason?: string }) => actOnShop(shop.id, action, reason),
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["shop", shop.id] }), queryClient.invalidateQueries({ queryKey: ["shops"] }), queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] })]);
      toast.success(response.message);
    },
  });
  const plain = (action: ShopAction, header: string, message: string, acceptLabel: string, danger = false) => () =>
    confirmAction({ header, message, acceptLabel, danger, accept: () => act.mutateAsync({ action }) });

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/dashboard/shops/${shop.id}/products`} className="p-button p-button-outlined gap-2">
        <span className="pi pi-box" aria-hidden /> Products
      </Link>
      <Link href={`/dashboard/shops/${shop.id}/stock`} className="p-button p-button-outlined gap-2">
        <span className="pi pi-chart-bar" aria-hidden /> Stock
      </Link>
      {isOwner && (shop.status === "Draft" || shop.status === "Changes requested") && (
        <Button icon="pi pi-send" label="Send for review" loading={act.isPending && act.variables?.action === "submit"}
          onClick={plain("submit", `Send ${shop.name} for review?`, "You cannot edit it while it is being reviewed. We will tell you as soon as it is decided.", "Send for review")} />
      )}
      {reviewer && shop.status === "Pending review" && (
        <>
          <Button icon="pi pi-check" severity="success" label="Approve" loading={act.isPending && act.variables?.action === "approve"}
            onClick={plain("approve", `Open ${shop.name}?`, `It starts selling at ${shop.address} as soon as you approve.`, "Approve")} />
          <Button icon="pi pi-replay" outlined label="Ask for changes" onClick={() => setAsking({ action: "request-changes", header: `What should ${vendor.name} change?`, label: "Send back" })} />
          <Button icon="pi pi-times" outlined severity="danger" label="Reject" onClick={() => setAsking({ action: "reject", header: `Reject ${shop.name}?`, label: "Reject" })} />
        </>
      )}
      {reviewer && shop.status === "Active" && (
        <Button icon="pi pi-ban" outlined severity="danger" label="Suspend" onClick={() => setAsking({ action: "suspend", header: `Suspend ${shop.name}?`, label: "Suspend" })} />
      )}
      {reviewer && shop.status === "Suspended" && (
        <Button icon="pi pi-play" severity="success" label="Reinstate" onClick={plain("reinstate", `Reopen ${shop.name}?`, "It starts selling again at once.", "Reinstate")} />
      )}
      {isOwner && !["Suspended", "Closed"].includes(shop.status) && (
        <Button icon="pi pi-power-off" text severity="danger" label="Close shop"
          onClick={plain("close", `Close ${shop.name}?`, "Buyers will no longer find it. Your other shops are not affected.", "Close shop", true)} />
      )}
      <ReasonDialog
        visible={!!asking}
        header={asking?.header ?? ""}
        prompt="The vendor reads this. Say what is wrong and what to do."
        acceptLabel={asking?.label ?? ""}
        onHide={() => setAsking(null)}
        onSubmit={(reason) => act.mutateAsync({ action: asking!.action, reason })}
      />
    </div>
  );
}

const detailsSchema = z.object({
  description: z.string().max(1000),
  phone: phone(true),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
});
type DetailsValues = z.infer<typeof detailsSchema>;

function ShopDetailsCard({ shop, editable }: { shop: Shop; editable: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema) });
  useResetOnOpen(editing, shop.id, () => setFormError(null));
  useEffect(() => {
    if (editing) reset({ description: shop.description ?? "", phone: shop.phone, email: shop.email ?? "" });
  }, [editing, shop, reset]);

  const save = useMutation({
    mutationFn: (v: DetailsValues) => updateShop(shop.id, { description: v.description || null, phone: v.phone, email: v.email || null }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["shop", shop.id] });
      toast.success(response.message);
      setEditing(false);
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["description", "phone", "email"])),
  });

  const rows: [string, React.ReactNode][] = [
    ["Web address", shop.address],
    ["Type", shop.shop_type],
    ["Phone", ugandanLocal(shop.phone)],
    ["Email", shop.email ?? "None"],
    ["Description", shop.description ?? "None"],
    ["Opened", shop.approved_at ? dateTime(shop.approved_at) : "Not yet"],
  ];

  return (
    <Card title="Details" actions={editable ? <Button size="small" outlined icon="pi pi-pencil" label="Edit" onClick={() => setEditing(true)} /> : undefined}>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className={label === "Description" ? "sm:col-span-2" : ""}>
            <dt className="text-xs text-(--text-muted)">{label}</dt>
            <dd className="text-sm text-(--text-primary)">{value}</dd>
          </div>
        ))}
      </dl>
      {shop.approved_at && <p className="mt-4 text-xs text-(--text-muted)">The name, web address and type were approved with the shop, so they stay. Contact support to change them.</p>}
      <Dialog header="Edit shop details" visible={editing} onHide={() => setEditing(false)} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
        <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
          <Field label="Description" error={errors.description?.message}>
            <Controller control={control} name="description" render={({ field }) => <InputTextarea {...field} rows={3} autoResize className="w-full" />} />
          </Field>
          <Field label="Shop phone" required error={errors.phone?.message}>
            <Controller control={control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Controller control={control} name="email" render={({ field }) => <InputText {...field} type="email" className="w-full" invalid={!!errors.email} />} />
          </Field>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Cancel" onClick={() => setEditing(false)} disabled={save.isPending} />
            <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function PayoutCard({ shop, vendor, isOwner, canEdit }: { shop: Shop; vendor: Vendor; isOwner: boolean; canEdit: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const options = (vendor.payout_destinations ?? []).filter((d) => d.status !== "Rejected").map((d) => ({ label: `${d.label} (${d.status})`, value: d.id }));
  const choose = useMutation({
    mutationFn: (destinationId: string) => updateShop(shop.id, { payout_destination_id: destinationId }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["shop", shop.id] });
      toast.success(response.message);
    },
  });
  const current = shop.payout_destination;

  return (
    <Card title="Where it is paid">
      {current ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-(--text-primary)">
          {current.label} <StatusTag status={current.status} raw />
        </p>
      ) : (
        <p className="text-sm text-(--text-muted)">Not chosen yet. A shop needs one before it is sent for review.</p>
      )}
      {current?.status === "Awaiting review" && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{current.status_reason} The shop opens once it is approved.</p>}
      {isOwner && canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Dropdown
            value={shop.payout_destination_id}
            options={options}
            onChange={(e) => choose.mutate(e.value)}
            placeholder={options.length ? "Choose where it is paid" : "Add one on My business first"}
            disabled={!options.length || choose.isPending}
            className="w-full sm:w-96"
            aria-label="Payout destination"
          />
          <Link href="/dashboard/vendor" className="text-sm font-semibold text-(--brand-ink) hover:underline">Add a payout destination</Link>
        </div>
      )}
    </Card>
  );
}

const locationSchema = z.object({
  name: requiredText("Name it, like Main shop or Store room.", 2).max(120),
  address: requiredText("Enter the address."),
  area: requiredText("Enter the area."),
  opening_hours: z.string().max(255),
});
type LocationValues = z.infer<typeof locationSchema>;

function LocationsCard({ shop, editable }: { shop: Shop; editable: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ location: ShopLocation | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const locations = shop.locations ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["shop", shop.id] });
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<LocationValues>({ resolver: zodResolver(locationSchema) });
  const visible = !!editing;
  useResetOnOpen(visible, editing?.location?.id ?? "new", () => setFormError(null));
  useEffect(() => {
    if (!editing) return;
    const l = editing.location;
    reset({ name: l?.name ?? "", address: l?.address ?? "", area: l?.area ?? "", opening_hours: l?.opening_hours ?? "" });
  }, [editing, reset]);

  const save = useMutation({
    mutationFn: (v: LocationValues) => {
      const payload = { ...v, opening_hours: v.opening_hours || null };
      return editing?.location ? updateLocation(shop.id, editing.location.id, payload) : addLocation(shop.id, payload);
    },
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
      setEditing(null);
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "address", "area", "opening_hours"])),
  });
  const makeDefault = useMutation({
    mutationFn: (l: ShopLocation) => updateLocation(shop.id, l.id, { name: l.name, address: l.address, area: l.area, phone: l.phone, opening_hours: l.opening_hours, is_default: true }),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const remove = useMutation({
    mutationFn: (l: ShopLocation) => deleteLocation(shop.id, l.id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });

  return (
    <Card title="Locations" actions={editable ? <Button size="small" icon="pi pi-plus" label="Add" onClick={() => setEditing({ location: null })} /> : undefined}>
      {locations.length === 0 ? (
        <EmptyState icon="pi-map-marker" title="No location" body="Add where the shop keeps its stock and sends orders from." />
      ) : (
        <ul className="divide-y divide-(--border-color)">
          {locations.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-(--text-primary)">
                  {l.name} {l.is_default && <span className="ml-1 rounded bg-(--brand-light) px-1.5 py-0.5 text-xs text-(--brand-ink)">Default</span>}
                </p>
                <p className="text-xs text-(--text-muted)">{[l.address, l.area, l.opening_hours].filter(Boolean).join(" · ")}</p>
              </div>
              {editable && (
                <div className="flex gap-1">
                  {!l.is_default && <Button size="small" text label="Make default" loading={makeDefault.isPending && makeDefault.variables?.id === l.id} onClick={() => makeDefault.mutate(l)} />}
                  <Button size="small" text icon="pi pi-pencil" aria-label={`Edit ${l.name}`} onClick={() => setEditing({ location: l })} />
                  {!l.is_default && (
                    <Button size="small" text severity="danger" icon="pi pi-trash" aria-label={`Remove ${l.name}`}
                      onClick={() => confirmAction({ header: `Remove ${l.name}?`, message: "Orders will no longer ship from here.", danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(l) })} />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog header={editing?.location ? `Edit ${editing.location.name}` : "Add a location"} visible={visible} onHide={() => setEditing(null)} style={{ width: "min(30rem, 95vw)" }} closable={!save.isPending}>
        <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
          <Field label="Name" required error={errors.name?.message}>
            <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" placeholder="Store room" invalid={!!errors.name} />} />
          </Field>
          <Field label="Address" required error={errors.address?.message}>
            <Controller control={control} name="address" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.address} />} />
          </Field>
          <Field label="Area" required error={errors.area?.message}>
            <Controller control={control} name="area" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.area} />} />
          </Field>
          <Field label="Opening hours" error={errors.opening_hours?.message}>
            <Controller control={control} name="opening_hours" render={({ field }) => <InputText {...field} className="w-full" placeholder="Mon to Sat, 8am to 7pm" />} />
          </Field>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Cancel" onClick={() => setEditing(null)} disabled={save.isPending} />
            <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function HistoryCard({ shop }: { shop: Shop }) {
  const reviews = shop.reviews ?? [];
  return (
    <Card title="History">
      {reviews.length === 0 ? (
        <p className="text-sm text-(--text-muted)">Nothing yet: the shop has not been sent for review.</p>
      ) : (
        <ol className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-l-2 border-(--brand-light) pl-3">
              <p className="text-sm font-medium text-(--text-primary)">{r.decision}</p>
              {r.reason && <p className="text-sm text-(--text-secondary)">{r.reason}</p>}
              <p className="text-xs text-(--text-muted)">{dateTime(r.created_at)}{r.created_by ? ` · ${r.created_by.name}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
