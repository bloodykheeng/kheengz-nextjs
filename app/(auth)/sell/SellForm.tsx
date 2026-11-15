"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAppRouter } from "@/hooks/useAppRouter";
import VerifyEmailStep from "@/components/auth/VerifyEmailStep";
import { FieldError, inputCls } from "@/components/auth/fields";
import { useAuth } from "@/contexts/AuthContext";
import { ALWAYS, applyServerErrors, email, requiredText, typedPhone } from "@/lib/validation";
import { toPhoneDigits } from "@/lib/phone";
import { applyToSell } from "@/services/vendors/vendors-service";
import { APP_NAME } from "@/lib/brand";

/** A NIN as printed on the national ID: 14 letters and digits starting CM or CF (spaces allowed while typing). */
const NIN = /^C[MF][A-Z0-9]{12}$/;
const ninOf = (value: string) => value.replace(/\s+/g, "").toUpperCase();

const schema = z
  .object({
    name: requiredText("Enter your full name.", 2).max(120),
    email: email(true),
    phone: typedPhone(),
    password: z.string().min(8, "At least 8 characters, with letters and numbers."),
    password_confirmation: z.string(),
    vendor_name: requiredText("Enter the name you trade under.", 2).max(160),
    kind: z.enum(["Individual", "Company"]),
    national_id_number: z.string().refine((v) => NIN.test(ninOf(v)), "Enter the 14-character NIN from your ID card, starting CM or CF."),
    registration_number: z.string().max(40),
    address: z.string().max(255),
    accept_terms: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!/[a-z]/i.test(v.password) || !/\d/.test(v.password)) ctx.addIssue({ code: "custom", path: ["password"], message: "Use letters and numbers." });
    if (v.password !== v.password_confirmation) ctx.addIssue({ code: "custom", path: ["password_confirmation"], message: "The passwords do not match." });
    if (v.kind === "Company" && !v.registration_number.trim()) ctx.addIssue({ code: "custom", path: ["registration_number"], message: "Enter the company registration number from URSB." });
    if (!v.accept_terms) ctx.addIssue({ code: "custom", path: ["accept_terms"], message: "Agree to the Seller Terms and the Privacy Policy to apply." });
  }, ALWAYS);

type Values = z.infer<typeof schema>;
const FIELDS = ["name", "email", "phone", "password", "vendor_name", "kind", "national_id_number", "registration_number", "address", "accept_terms"] as const;

/**
 * "Sell on Kheengz" (D35): the person's account and a Pending vendor in one form, then the email code,
 * then straight into their business page to add papers and the first shop. Approval comes after.
 */
export default function SellForm() {
  const router = useAppRouter();
  const { login } = useAuth();
  const [verifying, setVerifying] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { kind: "Individual", registration_number: "", address: "", accept_terms: false },
  });
  const kind = useWatch({ control, name: "kind" });

  const apply = useMutation({
    mutationFn: (v: Values) =>
      applyToSell({
        ...v,
        phone: toPhoneDigits(v.phone),
        national_id_number: ninOf(v.national_id_number),
        registration_number: v.kind === "Company" ? v.registration_number.trim() : null,
        address: v.address.trim() || null,
      }),
    meta: { skipGlobalError: true },
    onSuccess: (response) => setVerifying(response.data.email),
    onError: (error) => setFormError(applyServerErrors(error, setError, FIELDS)),
  });

  if (verifying) {
    return (
      <div>
        <p className="mb-6 rounded-lg bg-(--brand-light) px-4 py-3 text-sm text-(--brand-ink)">Your application is in. Confirm your email to continue.</p>
        <VerifyEmailStep
          email={verifying}
          backLabel="Change my details"
          onBack={() => setVerifying(null)}
          onVerified={(response) => {
            login(response.data.user, response.data.token);
            router.push("/dashboard/vendor");
          }}
        />
      </div>
    );
  }

  const busy = apply.isPending;

  return (
    <form onSubmit={handleSubmit((v) => { setFormError(null); apply.mutate(v); })} noValidate className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-(--ink)">Sell on {APP_NAME}</h1>
        <p className="mt-1 text-sm text-(--ink)/60">
          Open your shops, get paid to your Mobile Money or bank as each order is paid. We check every seller before their shops open.
        </p>
      </div>

      <fieldset className="space-y-4" disabled={busy}>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-(--accent)">1. You</legend>
        <TextField label="Full name" error={errors.name?.message}>
          <input {...register("name")} autoComplete="name" placeholder="As on your national ID" className={`${inputCls(!!errors.name)} px-3`} />
        </TextField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" error={errors.email?.message}>
            <input {...register("email")} type="email" autoComplete="email" placeholder="you@example.com" className={`${inputCls(!!errors.email)} px-3`} />
          </TextField>
          <TextField label="Phone" error={errors.phone?.message}>
            <input {...register("phone")} type="tel" autoComplete="tel" placeholder="0772 123 456" className={`${inputCls(!!errors.phone)} px-3`} />
          </TextField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Password" error={errors.password?.message}>
            <input {...register("password")} type="password" autoComplete="new-password" placeholder="Letters and numbers, 8 or more" className={`${inputCls(!!errors.password)} px-3`} />
          </TextField>
          <TextField label="Password again" error={errors.password_confirmation?.message}>
            <input {...register("password_confirmation")} type="password" autoComplete="new-password" placeholder="Type it again" className={`${inputCls(!!errors.password_confirmation)} px-3`} />
          </TextField>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={busy}>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-(--accent)">2. Your business</legend>
        <TextField label="Business name" error={errors.vendor_name?.message} hint="The name you trade and are paid under. Each shop gets its own name later.">
          <input {...register("vendor_name")} placeholder="Home Nest" className={`${inputCls(!!errors.vendor_name)} px-3`} />
        </TextField>
        <div role="radiogroup" aria-label="You sell as" className="grid grid-cols-2 gap-3">
          {(["Individual", "Company"] as const).map((k) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm ${kind === k ? "border-(--brand) bg-(--brand-light) text-(--brand-ink)" : "border-(--brand)/20 text-(--ink)"}`}>
              <input {...register("kind")} type="radio" value={k} className="accent-(--brand)" />
              {k === "Individual" ? "Myself" : "A registered company"}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="National ID Number (NIN)" error={errors.national_id_number?.message} hint={kind === "Company" ? "The owner's or a director's." : undefined}>
            <input {...register("national_id_number")} autoCapitalize="characters" placeholder="CM 9012 3456 78AB" className={`${inputCls(!!errors.national_id_number)} px-3 uppercase`} />
          </TextField>
          {kind === "Company" && (
            <TextField label="URSB registration number" error={errors.registration_number?.message}>
              <input {...register("registration_number")} placeholder="80020001234567" className={`${inputCls(!!errors.registration_number)} px-3`} />
            </TextField>
          )}
        </div>
        <TextField label="Business address" error={errors.address?.message} hint="Optional. Where you work from.">
          <input {...register("address")} autoComplete="street-address" placeholder="Kikuubo, Kampala" className={`${inputCls(!!errors.address)} px-3`} />
        </TextField>
      </fieldset>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input {...register("accept_terms")} type="checkbox" disabled={busy} className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-(--brand)" />
          <span className="text-sm text-(--ink)/75">I agree to the Seller Terms and the Privacy Policy, and that my ID is checked before my shops open.</span>
        </label>
        <FieldError msg={errors.accept_terms?.message} />
      </div>

      {formError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-(--brand) py-3 text-sm font-bold text-white transition-colors hover:bg-(--brand-mid) active:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Sending…" : "Apply to sell"}
      </button>
      <p className="text-center text-sm text-(--ink)/60">
        Already selling?{" "}
        <Link href="/login" className="font-semibold text-(--brand-ink) hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function TextField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-(--ink)">
        {label}
        {children}
      </label>
      {hint && !error && <p className="mt-1 text-xs text-(--ink)/55">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}
