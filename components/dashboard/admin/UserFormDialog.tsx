"use client";

import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PhoneField from "@/components/dashboard/forms/PhoneField";
import { Field } from "@/components/dashboard/ui";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { createUser, updateUser, type User } from "@/services/users/users-service";
import { applyServerErrors, email, phone, requiredText } from "@/lib/validation";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";

/** Account roles (D26). A vendor's own staff (Owner, Staff) are places in a shop, set there, never here. */
export const ROLES = [
  { label: "Admin", value: "Admin" },
  { label: "Staff", value: "Staff" },
  { label: "Vendor", value: "Vendor" },
];

const schema = z
  .object({
    name: requiredText("Enter the name.", 2).max(120),
    email: email(true),
    // Contacts may be in any country (lib/validation phone()); only Mobile Money is Ugandan.
    phone: phone(false),
    role: z.enum(["Admin", "Staff", "Vendor"]),
    status: z.enum(["Active", "Inactive"]),
    password: z.string(),
  })
  .refine((d) => !d.password || d.password.length >= 8, { path: ["password"], message: "At least 8 characters, or leave it empty." });

type Values = z.infer<typeof schema>;
const FIELDS = ["name", "email", "phone", "role", "status", "password"] as const;

/** Add or edit an account (Admin). A new account gets its sign-in details by email. */
export default function UserFormDialog({ user, visible, onHide }: { user: User | null; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  // A fresh start each time it opens, before the paint.
  useResetOnOpen(visible, user?.id ?? "new", () => setFormError(null));

  // The form library keeps its own store; it is seeded from here once the dialog shows.
  useEffect(() => {
    if (!visible) return;
    reset(
      user
        ? { name: user.name, email: user.email ?? "", phone: user.phone ?? "", role: user.role === "No Role" ? "Staff" : user.role, status: user.status, password: "" }
        : { name: "", email: "", phone: "", role: "Staff", status: "Active", password: "" },
    );
  }, [visible, user, reset]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const payload = { ...v, phone: v.phone || null, password: v.password || undefined };
      return user ? updateUser(user.id, payload) : createUser(payload);
    },
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS)),
  });

  return (
    <Dialog maximizable header={user ? "Edit account" : "New account"} visible={visible} onHide={onHide} style={{ width: "min(34rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate autoComplete="off" onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <Field label="Name" required error={errors.name?.message}>
          <Controller control={control} name="name" render={({ field }) => <InputText {...field} className="w-full" placeholder="Enter the full name" invalid={!!errors.name} />} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Controller control={control} name="email" render={({ field }) => <InputText {...field} type="email" className="w-full" placeholder="Enter the email address" invalid={!!errors.email} />} />
        </Field>
        <Field label="Phone" error={errors.phone?.message} hint="Optional. Any country: pick the flag.">
          <Controller control={control} name="phone" render={({ field }) => <PhoneField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.phone} />} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role" required error={errors.role?.message}>
            <Controller control={control} name="role" render={({ field }) => <Dropdown value={field.value} options={ROLES} onChange={(e) => field.onChange(e.value)} className="w-full" />} />
          </Field>
          <Field label="Status" required error={errors.status?.message}>
            <Controller control={control} name="status" render={({ field }) => <Dropdown value={field.value} options={["Active", "Inactive"]} onChange={(e) => field.onChange(e.value)} className="w-full" />} />
          </Field>
        </div>
        <Field
          label={user ? "New password" : "Password"}
          error={errors.password?.message}
          hint={user ? "Leave empty to keep the current one." : "Leave empty to generate one. The sign-in details are emailed to them."}
        >
          <Controller
            control={control}
            name="password"
            render={({ field }) => <Password value={field.value} onChange={(e) => field.onChange(e.target.value)} feedback={false} toggleMask className="w-full" inputClassName="w-full" invalid={!!errors.password} autoComplete="new-password" />}
          />
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
