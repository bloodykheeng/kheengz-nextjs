"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { SelectButton } from "primereact/selectbutton";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import PhoneField from "@/components/dashboard/forms/PhoneField";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { ALWAYS, applyServerErrors, email, phone, requiredText } from "@/lib/validation";
import { addVendorMember, removeVendorMember, updateVendorMember } from "@/services/vendors/vendors-service";
import type { Vendor, VendorMember } from "@/services/types/kheengz";

/**
 * Who works for a vendor (D26, D31). An Owner runs every shop and the money; Staff run only the shops
 * they are given. The Owner adds people by email (a new person gets their sign-in details emailed),
 * changes their place or shops, and removes them; the last Owner stays.
 */
export default function VendorMembersCard({ vendor, mode }: { vendor: Vendor; mode: "owner" | "reviewer" | "member" }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [editing, setEditing] = useState<{ member: VendorMember | null } | null>(null);
  const members = vendor.members ?? [];
  const shopName = (id: string) => vendor.shops?.find((s) => s.id === id)?.name ?? "A shop";

  const remove = useMutation({
    mutationFn: (m: VendorMember) => removeVendorMember(vendor.id, m.id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      toast.success(response.message);
    },
  });

  return (
    <Card title="People" actions={mode === "owner" ? <Button size="small" icon="pi pi-user-plus" label="Add" onClick={() => setEditing({ member: null })} /> : undefined}>
      <ul className="divide-y divide-(--border-color)">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-(--text-primary)">
                {m.name} <span className="ml-1 rounded bg-(--brand-light) px-1.5 py-0.5 text-xs text-(--brand-ink)">{m.role}</span>
              </p>
              <p className="truncate text-xs text-(--text-muted)">
                {[m.email, m.phone].filter(Boolean).join(" · ")}
                {m.role === "Staff" ? ` · runs ${(m.shop_ids ?? []).map(shopName).join(", ") || "no shop yet"}` : " · runs every shop"}
              </p>
            </div>
            {mode === "owner" && (
              <div className="flex gap-1">
                <Button size="small" text icon="pi pi-pencil" aria-label={`Change ${m.name}`} onClick={() => setEditing({ member: m })} />
                {m.id !== me?.id && (
                  <Button
                    size="small"
                    text
                    severity="danger"
                    icon="pi pi-user-minus"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => confirmAction({ header: `Remove ${m.name}?`, message: `They will no longer work for ${vendor.name}. Their account stays.`, danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(m) })}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {mode === "owner" && <MemberDialog vendor={vendor} member={editing?.member ?? null} visible={!!editing} onHide={() => setEditing(null)} />}
    </Card>
  );
}

const memberSchema = z
  .object({
    name: requiredText("Enter their name.", 2).max(120),
    email: email(true),
    phone: phone(false),
    role: z.enum(["Owner", "Staff"]),
    shop_ids: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.role === "Staff" && v.shop_ids.length === 0) ctx.addIssue({ code: "custom", path: ["shop_ids"], message: "Choose the shops they run." });
  }, ALWAYS);

type MemberValues = z.infer<typeof memberSchema>;

function MemberDialog({ vendor, member, visible, onHide }: { vendor: Vendor; member: VendorMember | null; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<MemberValues>({ resolver: zodResolver(memberSchema) });
  const role = useWatch({ control, name: "role" });

  useResetOnOpen(visible, member?.id ?? "new", () => setFormError(null));
  useEffect(() => {
    if (!visible) return;
    reset(member
      ? { name: member.name, email: member.email ?? "", phone: member.phone ?? "", role: member.role, shop_ids: member.shop_ids ?? [] }
      : { name: "", email: "", phone: "", role: "Staff", shop_ids: [] });
  }, [visible, member, reset]);

  const save = useMutation({
    mutationFn: (v: MemberValues) => {
      const place = { role: v.role, shop_ids: v.role === "Staff" ? v.shop_ids : [] };
      return member ? updateVendorMember(vendor.id, member.id, place) : addVendorMember(vendor.id, { ...place, name: v.name, email: v.email, phone: v.phone || null });
    },
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "email", "phone", "role", "shop_ids"])),
  });

  const shopOptions = (vendor.shops ?? []).filter((s) => s.status !== "Closed").map((s) => ({ label: s.name, value: s.id }));

  return (
    <Dialog header={member ? `Change ${member.name}` : "Add someone"} visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        {!member && (
          <>
            <Field label="Name" required error={errors.name?.message}>
              <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.name} />} />
            </Field>
            <Field label="Email" required error={errors.email?.message} hint="An existing account joins as it is; otherwise one is made and its sign-in details emailed.">
              <Controller control={control} name="email" render={({ field }) => <InputText {...field} type="email" className="w-full" invalid={!!errors.email} />} />
            </Field>
            <Field label="Phone" error={errors.phone?.message} hint="Optional.">
              <Controller control={control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />} />
            </Field>
          </>
        )}
        <Field label="Place" required error={errors.role?.message} hint={role === "Owner" ? "Runs every shop, the money, papers and people." : "Runs only the shops chosen below: products, stock and orders."}>
          <Controller control={control} name="role" render={({ field }) => <SelectButton value={field.value} options={["Staff", "Owner"]} onChange={(e) => e.value && field.onChange(e.value)} allowEmpty={false} />} />
        </Field>
        {role === "Staff" && (
          <Field label="Shops they run" required error={errors.shop_ids?.message}>
            <Controller control={control} name="shop_ids" render={({ field }) => (
              <MultiSelect value={field.value} options={shopOptions} onChange={(e) => field.onChange(e.value)} placeholder={shopOptions.length ? "Choose shops" : "Open a shop first"} display="chip" className="w-full" invalid={!!errors.shop_ids} />
            )} />
          </Field>
        )}
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
