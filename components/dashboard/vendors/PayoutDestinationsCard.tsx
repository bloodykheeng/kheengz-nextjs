"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, Field, StatusTag } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { guessNetwork } from "@/lib/format";
import { ALWAYS, applyServerErrors, isUgMobileDigits, requiredText } from "@/lib/validation";
import { toPhoneDigits } from "@/lib/phone";
import {
  addPayoutDestination,
  decidePayoutDestination,
  deletePayoutDestination,
  getPayoutBanks,
} from "@/services/vendors/vendors-service";
import type { PayoutDestination, Vendor } from "@/services/types/kheengz";

/**
 * Where a vendor is paid (D12, D31). The Owner adds Mobile Money numbers and bank accounts (a bank
 * account is checked with MarzPay as it is saved) and removes ones no shop uses; a reviewer approves or
 * rejects the ones waiting. Never edited: a change is a new destination.
 */
export default function PayoutDestinationsCard({ vendor, mode }: { vendor: Vendor; mode: "owner" | "reviewer" | "member" }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const destinations = vendor.payout_destinations ?? [];
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] }), queryClient.invalidateQueries({ queryKey: ["shop"] })]);

  const remove = useMutation({
    mutationFn: (id: string) => deletePayoutDestination(id),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });
  const decide = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: "approve" | "reject"; reason?: string }) => decidePayoutDestination(id, decision, reason),
    onSuccess: async (response) => {
      await refresh();
      toast.success(response.message);
    },
  });

  return (
    <Card title="Payout destinations" actions={mode === "owner" ? <Button size="small" icon="pi pi-plus" label="Add" onClick={() => setAdding(true)} /> : undefined}>
      {destinations.length === 0 ? (
        <EmptyState
          icon="pi-wallet"
          title="No payout destination yet"
          body={mode === "owner" ? "Add the Mobile Money number or bank account your shops are paid to. Each shop then picks one." : "The vendor has not added one."}
        />
      ) : (
        <ul className="divide-y divide-(--border-color)">
          {destinations.map((d) => (
            <DestinationRow
              key={d.id}
              destination={d}
              mode={mode}
              onRemove={() => confirmAction({ header: `Remove ${d.label}?`, message: "A shop paid to it must pick another first.", danger: true, acceptLabel: "Remove", accept: () => remove.mutateAsync(d.id) })}
              onApprove={() => confirmAction({ header: `Approve ${d.label}?`, message: `Money for ${vendor.name} may then be paid to it.`, acceptLabel: "Approve", accept: () => decide.mutateAsync({ id: d.id, decision: "approve" }) })}
              onReject={(reason) => decide.mutateAsync({ id: d.id, decision: "reject", reason })}
            />
          ))}
        </ul>
      )}
      {mode === "owner" && <AddDestinationDialog vendor={vendor} visible={adding} onHide={() => setAdding(false)} />}
    </Card>
  );
}

function DestinationRow({ destination: d, mode, onRemove, onApprove, onReject }: { destination: PayoutDestination; mode: string; onRemove: () => void; onApprove: () => void; onReject: (reason: string) => Promise<unknown> }) {
  const [rejecting, setRejecting] = useState(false);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-(--text-primary)">
          {d.label} <StatusTag status={d.status} raw />
        </p>
        <p className="text-xs text-(--text-muted)">
          In the name of {d.account_name}
          {d.checked_name ? ` · the bank holds it as ${d.checked_name}` : ""}
        </p>
        {d.status_reason && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{d.status_reason}</p>}
      </div>
      <div className="flex gap-2">
        {mode === "reviewer" && d.status === "Awaiting review" && (
          <>
            <Button size="small" severity="success" icon="pi pi-check" label="Approve" onClick={onApprove} />
            <Button size="small" outlined severity="danger" icon="pi pi-times" label="Reject" onClick={() => setRejecting(true)} />
          </>
        )}
        {mode === "owner" && <Button size="small" text severity="danger" icon="pi pi-trash" aria-label={`Remove ${d.label}`} onClick={onRemove} />}
      </div>
      <ReasonDialog
        visible={rejecting}
        header={`Reject ${d.label}?`}
        prompt="The vendor reads this. Say what is wrong and what to do."
        acceptLabel="Reject"
        onHide={() => setRejecting(false)}
        onSubmit={onReject}
      />
    </li>
  );
}

const destinationSchema = z
  .object({
    method: z.enum(["Mobile Money", "Bank"]),
    network: z.enum(["MTN", "Airtel"]).nullable(),
    bank_name: z.string().nullable(),
    account_number: requiredText("Enter the number."),
    account_name: requiredText("Enter the name the account is registered in.", 2).max(160),
  })
  .superRefine((v, ctx) => {
    if (v.method === "Mobile Money") {
      const digits = toPhoneDigits(v.account_number);
      if (!isUgMobileDigits(digits)) ctx.addIssue({ code: "custom", path: ["account_number"], message: "Enter an MTN or Airtel Uganda number, like 0772 123 456." });
      else if (v.network && guessNetwork(digits) !== v.network) ctx.addIssue({ code: "custom", path: ["account_number"], message: `This is an ${guessNetwork(digits)} number. Choose ${guessNetwork(digits)}.` });
      if (!v.network) ctx.addIssue({ code: "custom", path: ["network"], message: "Choose MTN or Airtel." });
    } else if (!v.bank_name) {
      ctx.addIssue({ code: "custom", path: ["bank_name"], message: "Choose the bank." });
    }
  }, ALWAYS);

type DestinationValues = z.infer<typeof destinationSchema>;

function AddDestinationDialog({ vendor, visible, onHide }: { vendor: Vendor; visible: boolean; onHide: () => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, reset, setError, setValue, formState: { errors } } = useForm<DestinationValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: { method: "Mobile Money", network: null, bank_name: null, account_number: "", account_name: "" },
  });
  const method = useWatch({ control, name: "method" });
  const number = useWatch({ control, name: "account_number" });

  useResetOnOpen(visible, "", () => setFormError(null));
  useEffect(() => {
    if (visible) reset({ method: "Mobile Money", network: null, bank_name: null, account_number: "", account_name: vendor.name });
  }, [visible, reset, vendor.name]);

  // The network follows the number's prefix as it is typed (076-079 MTN, 070/074/075 Airtel).
  const guessed = method === "Mobile Money" ? guessNetwork(number) : null;
  useEffect(() => {
    if (guessed) setValue("network", guessed, { shouldValidate: false });
  }, [guessed, setValue]);

  const banks = useQuery({ queryKey: ["payout-banks"], queryFn: getPayoutBanks, enabled: visible && method === "Bank", staleTime: 60 * 60 * 1000, meta: { skipGlobalError: true } });

  const save = useMutation({
    mutationFn: (v: DestinationValues) =>
      addPayoutDestination(vendor.id, {
        method: v.method,
        network: v.method === "Mobile Money" ? v.network : null,
        bank_name: v.method === "Bank" ? v.bank_name : null,
        account_number: v.method === "Mobile Money" ? toPhoneDigits(v.account_number) : v.account_number,
        account_name: v.account_name,
      }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      toast.success(response.message);
      onHide();
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["method", "network", "bank_name", "account_number", "account_name"])),
  });

  return (
    <Dialog header="Add a payout destination" visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} closable={!save.isPending}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => { setFormError(null); save.mutate(v); })}>
        <Controller control={control} name="method" render={({ field }) => (
          <SelectButton value={field.value} options={["Mobile Money", "Bank"]} onChange={(e) => e.value && field.onChange(e.value)} className="w-full" allowEmpty={false} />
        )} />
        {method === "Mobile Money" ? (
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Mobile Money number" required error={errors.account_number?.message}>
              <Controller control={control} name="account_number" render={({ field }) => <InputText {...field} inputMode="tel" className="w-full" placeholder="0772 123 456" invalid={!!errors.account_number} />} />
            </Field>
            <Field label="Network" required error={errors.network?.message}>
              <Controller control={control} name="network" render={({ field }) => <Dropdown value={field.value} options={["MTN", "Airtel"]} onChange={(e) => field.onChange(e.value)} placeholder="Choose" className="w-full" invalid={!!errors.network} />} />
            </Field>
          </div>
        ) : (
          <>
            <Field label="Bank" required error={errors.bank_name?.message ?? (banks.isError ? "The list of banks could not be loaded. Try again in a minute." : undefined)}>
              <Controller control={control} name="bank_name" render={({ field }) => (
                <Dropdown value={field.value} options={(banks.data ?? []).map((b) => b.name)} onChange={(e) => field.onChange(e.value)} placeholder={banks.isPending ? "Loading banks…" : "Choose the bank"} filter className="w-full" invalid={!!errors.bank_name} />
              )} />
            </Field>
            <Field label="Account number" required error={errors.account_number?.message}>
              <Controller control={control} name="account_number" render={({ field }) => <InputText {...field} inputMode="numeric" className="w-full" placeholder="As on your bank statement" invalid={!!errors.account_number} />} />
            </Field>
          </>
        )}
        <Field label="Name on the account" required error={errors.account_name?.message} hint="Exactly as the network or bank has it. It must be the business or one of its Owners, or the Admin checks it first.">
          <Controller control={control} name="account_name" render={({ field }) => <InputText {...field} className="w-full" invalid={!!errors.account_name} />} />
        </Field>
        <p className="text-xs text-(--text-muted)">We text your business phone whenever a payout destination is added.</p>
        {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={save.isPending} />
          <Button type="submit" icon="pi pi-check" label={method === "Bank" ? "Check and save" : "Save"} loading={save.isPending} />
        </div>
      </form>
    </Dialog>
  );
}

/** One reason, required, for a decision the vendor reads (reject, suspend, ask for changes). */
export function ReasonDialog({ visible, header, prompt, acceptLabel, onHide, onSubmit }: {
  visible: boolean;
  header: string;
  prompt: string;
  acceptLabel: string;
  onHide: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useResetOnOpen(visible, "", () => {
    setReason("");
    setError(null);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("Say why, in a sentence the vendor will read.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      onHide();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog header={header} visible={visible} onHide={onHide} style={{ width: "min(30rem, 95vw)" }} closable={!busy}>
      <form className="space-y-4" noValidate onSubmit={submit}>
        <Field label="Reason" required error={error ?? undefined} hint={prompt}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className="p-inputtext w-full" aria-invalid={!!error} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Cancel" onClick={onHide} disabled={busy} />
          <Button type="submit" severity="danger" label={acceptLabel} loading={busy} />
        </div>
      </form>
    </Dialog>
  );
}
