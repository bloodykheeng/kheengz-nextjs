"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Field } from "@/components/dashboard/ui";
import PhoneField from "@/components/dashboard/forms/PhoneField";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { ugandanLocal } from "@/lib/phone";
import { applyServerErrors, phone, requiredText } from "@/lib/validation";
import { updateVendor } from "@/services/vendors/vendors-service";
import type { Vendor } from "@/services/types/kheengz";

/**
 * A vendor's details. The Owner edits the contact details any time; the identity the Admin checks
 * (name, NIN, registration) only while the application is Pending or Rejected.
 */
export default function VendorDetailsCard({ vendor, editable }: { vendor: Vendor; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const rows: [string, React.ReactNode][] = [
    ["Business name", vendor.name],
    ["Sells as", vendor.kind === "Company" ? "A registered company" : "An individual"],
    ["National ID Number", <span key="nin" className="font-mono">{vendor.national_id_number}</span>],
    ...(vendor.kind === "Company" ? [["URSB number", vendor.registration_number ?? "None"] as [string, React.ReactNode]] : []),
    ["Phone", ugandanLocal(vendor.phone)],
    ["Email", vendor.email ?? "None"],
    ["Address", vendor.address ?? "None"],
  ];

  return (
    <Card title="Details" actions={editable ? <Button size="small" outlined icon="pi pi-pencil" label="Edit" onClick={() => setEditing(true)} /> : undefined}>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-(--text-muted)">{label}</dt>
            <dd className="text-sm text-(--text-primary)">{value}</dd>
          </div>
        ))}
      </dl>
      {editable && <DetailsDialog vendor={vendor} visible={editing} onHide={() => setEditing(false)} />}
    </Card>
  );
}

const schema = z.object({
  name: requiredText("Enter the business name.", 2).max(160),
  registration_number: z.string().max(40),
  phone: phone(true),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
  address: z.string().max(255),
});
type Values = z.infer<typeof schema>;

function DetailsDialog({ vendor, visible, onHide }: { vendor: Vendor; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const identityOpen = vendor.status === "Pending" || vendor.status === "Rejected";
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  useResetOnOpen(visible, vendor.id, () => setFormError(null));
  useEffect(() => {
    if (visible) reset({ name: vendor.name, registration_number: vendor.registration_number ?? "", phone: vendor.phone, email: vendor.email ?? "", address: vendor.address ?? "" });
  }, [visible, vendor, reset]);

  const save = useMutation({
    mutationFn: (v: Values) =>
      updateVendor(vendor.id, {
        ...(identityOpen ? { name: v.name, ...(vendor.kind === "Company" ? { registration_number: v.registration_number || null } : {}) } : {}),
        phone: v.phone,
        email: v.email || null,
        address: v.address || null,
      }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] }), queryClient.invalidateQueries({ queryKey: ["vendors"] })]);
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "registration_number", "phone", "email", "address"])),
  });

  return (
    <Dialog header="Edit details" visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <Field label="Business name" required error={errors.name?.message} hint={identityOpen ? undefined : "Checked when you were approved. Contact support to change it."}>
          <Controller control={control} name="name" render={({ field }) => <InputText {...field} disabled={!identityOpen} className="w-full" invalid={!!errors.name} />} />
        </Field>
        {vendor.kind === "Company" && (
          <Field label="URSB registration number" error={errors.registration_number?.message}>
            <Controller control={control} name="registration_number" render={({ field }) => <InputText {...field} disabled={!identityOpen} className="w-full" />} />
          </Field>
        )}
        <Field label="Phone" required error={errors.phone?.message} hint="Decisions and payout alerts are texted here.">
          <Controller control={control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Controller control={control} name="email" render={({ field }) => <InputText {...field} type="email" className="w-full" invalid={!!errors.email} />} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <Controller control={control} name="address" render={({ field }) => <InputText {...field} className="w-full" />} />
        </Field>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label="Save" loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}
