"use client";

import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, PageHeader, SwitchRow } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { ugx } from "@/lib/format";
import { APP_NAME } from "@/lib/brand";
import { applyServerErrors } from "@/lib/validation";
import { getPlatformSettings, updatePlatformSettings } from "@/services/vendors/vendors-service";
import { CardsPageSkeleton } from "@/components/dashboard/RecordSkeleton";

const whole = (message: string, max: number) => z.number({ error: message }).int().min(0, message).max(max, message);

const schema = z.object({
  // Shown as a percentage with two decimals, stored in basis points (300 = 3%).
  commission_percent: z.number({ error: "Enter the commission." }).min(0, "0% or more.").max(50, "Up to 50%."),
  fixed_fee_per_order: whole("Enter a fee in UGX, or 0.", 1_000_000),
  service_fee_per_order: whole("Enter a fee in UGX, or 0.", 1_000_000),
  debt_limit_amount: whole("Enter an amount in UGX.", 100_000_000),
  debt_limit_days: z.number({ error: "Enter the days." }).int().min(1, "At least 1 day.").max(365, "Up to 365 days."),
  marzpay_enabled: z.boolean(),
  olycash_enabled: z.boolean(),
  card_enabled: z.boolean(),
  pay_on_delivery_enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

/**
 * The platform's money rules and payment switches (D15, D23, D28, D34). A shop's own commission or
 * debt limits, where set, override these. Every save is confirmed and audited.
 */
export default function PlatformSettingsForm() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["platform-settings"], queryFn: getPlatformSettings });
  const { control, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { commission_percent: 0, fixed_fee_per_order: 0, service_fee_per_order: 0, debt_limit_amount: 0, debt_limit_days: 1, marzpay_enabled: false, olycash_enabled: false, card_enabled: false, pay_on_delivery_enabled: false } });

  // Seeded from the saved settings, and again after each save; never while someone is editing.
  useEffect(() => {
    if (query.data && !isDirty) {
      const s = query.data;
      reset({ ...s, commission_percent: s.commission_bps / 100 });
    }
  }, [query.data, isDirty, reset]);

  const save = useMutation({
    mutationFn: ({ commission_percent, ...rest }: Values) => updatePlatformSettings({ ...rest, commission_bps: Math.round(commission_percent * 100) }),
    meta: { skipGlobalError: true },
    onSuccess: async (response) => {
      reset({ ...response.data, commission_percent: response.data.commission_bps / 100 });
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success(response.message);
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, { commission_bps: "commission_percent", fixed_fee_per_order: "fixed_fee_per_order", service_fee_per_order: "service_fee_per_order", debt_limit_amount: "debt_limit_amount", debt_limit_days: "debt_limit_days" })),
  });

  if (query.isPending) return <CardsPageSkeleton padded={false} />;

  const money = (name: "fixed_fee_per_order" | "service_fee_per_order" | "debt_limit_amount") => (
    <Controller control={control} name={name} render={({ field }) => (
      <InputNumber value={field.value ?? null} onValueChange={(e) => field.onChange(e.value ?? NaN)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" invalid={!!errors[name]} />
    )} />
  );

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        confirmAction({ header: "Save the platform settings?", message: `Commission ${v.commission_percent}%, shops hidden past ${ugx(v.debt_limit_amount)} or ${v.debt_limit_days} days unpaid. New orders use these at once.`, acceptLabel: "Save", accept: () => save.mutateAsync(v) });
      })}
    >
      <PageHeader title="Platform settings" subtitle="The money rules every shop follows, unless the shop has its own." actions={<Button type="submit" icon="pi pi-check" label="Save" disabled={!isDirty} loading={save.isPending} />} />
      {isDirty && <p className="text-sm text-amber-700 dark:text-amber-300">Unsaved changes.</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`What ${APP_NAME} keeps`}>
          <div className="space-y-4">
            <Field label="Commission on each order's items" required error={errors.commission_percent?.message} hint="Taken from each payout; never on the delivery fee (D23).">
              <Controller control={control} name="commission_percent" render={({ field }) => (
                <InputNumber value={field.value ?? null} onValueChange={(e) => field.onChange(e.value ?? NaN)} suffix=" %" minFractionDigits={0} maxFractionDigits={2} min={0} max={50} className="w-full" inputClassName="w-full" invalid={!!errors.commission_percent} />
              )} />
            </Field>
            <Field label="Fixed fee per shop order" required error={errors.fixed_fee_per_order?.message}>{money("fixed_fee_per_order")}</Field>
            <Field label="Service fee per shop order" required error={errors.service_fee_per_order?.message} hint="UGX 0 at launch.">{money("service_fee_per_order")}</Field>
          </div>
        </Card>
        <Card title="When an unpaid balance hides a shop">
          <div className="space-y-4">
            <Field label="Owed more than" required error={errors.debt_limit_amount?.message} hint="Only the shop that owes is hidden (D28).">{money("debt_limit_amount")}</Field>
            <Field label="Or anything unpaid for" required error={errors.debt_limit_days?.message}>
              <Controller control={control} name="debt_limit_days" render={({ field }) => (
                <InputNumber value={field.value ?? null} onValueChange={(e) => field.onChange(e.value ?? NaN)} suffix=" days" min={1} max={365} className="w-full" inputClassName="w-full" invalid={!!errors.debt_limit_days} />
              )} />
            </Field>
          </div>
        </Card>
        <Card title="Ways to pay" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["marzpay_enabled", "MarzPay Mobile Money", "MTN and Airtel prompts through MarzPay."],
              ["olycash_enabled", "OlyCash Mobile Money", "MTN and Airtel prompts through OlyCash."],
              ["card_enabled", "Card", "Visa and Mastercard through MarzPay."],
              ["pay_on_delivery_enabled", "Pay on delivery", "Each shop still chooses where it allows it."],
            ] as const).map(([name, label, hint]) => (
              <Controller key={name} control={control} name={name} render={({ field }) => <SwitchRow label={label} hint={hint} checked={!!field.value} onChange={field.onChange} />} />
            ))}
          </div>
        </Card>
      </div>
      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}
    </form>
  );
}
