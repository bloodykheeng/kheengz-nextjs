"use client";

import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { MdMarkEmailRead } from "react-icons/md";
import { postResendCode, postVerifyEmail } from "@/services/auth/auth-service";
import type { LoginResponse } from "@/services/types/auth";
import { applyServerErrors } from "@/lib/validation";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.") });
type Values = z.infer<typeof schema>;

/** Seconds before another code may be asked for (the API allows three a minute). */
const RESEND_AFTER = 30;

/**
 * Confirming an email with the 6-digit code it was sent (sign-up, or signing in before having
 * confirmed). A correct code signs the person in (AuthContext login(), as after a sign-in).
 */
export default function VerifyEmailStep({
  email,
  onVerified,
  onBack,
  backLabel = "Use a different email",
}: {
  email: string;
  onVerified: (response: AxiosResponse<LoginResponse>) => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_AFTER);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: "" } });

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = useMutation({
    mutationFn: (v: Values) => postVerifyEmail({ email, code: v.code }),
    meta: { skipGlobalError: true },
    onSuccess: onVerified,
    onError: (error) => setFormError(applyServerErrors(error, setError, ["code"])),
  });

  const resend = useMutation({
    mutationFn: () => postResendCode(email),
    meta: { skipGlobalError: true },
    onSuccess: (response) => {
      setNotice(response.data.message);
      setFormError(null);
      setWait(RESEND_AFTER);
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, [])),
  });

  const inputCls =
    "w-full rounded-xl border bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-[#1f2a24] outline-none transition focus:ring-4 focus:ring-(--brand-ring) dark:bg-white/5 dark:text-(--ink)";

  return (
    <form
      noValidate
      className="w-full space-y-5"
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        verify.mutate(v);
      })}
    >
      <div className="space-y-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-(--brand)/10 text-2xl text-(--brand-ink)">
          <MdMarkEmailRead aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-semibold text-(--ink)">Check your email</h1>
        <p className="text-sm text-(--ink)/65">
          We sent a 6-digit code to <strong className="text-(--ink)">{email}</strong>. Enter it to confirm the address and sign in. It works for 10 minutes.
        </p>
      </div>

      <div>
        <label htmlFor="verify-code" className="mb-1.5 block text-sm font-medium text-(--ink)">
          Code
        </label>
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <input
              id="verify-code"
              {...field}
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              aria-invalid={!!errors.code}
              className={`${inputCls} ${errors.code ? "border-red-500" : "border-(--ink)/15 focus:border-(--brand) dark:border-white/15"}`}
            />
          )}
        />
        {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      {notice && !formError && <p className="rounded-xl bg-(--brand)/10 px-4 py-3 text-sm text-(--brand-ink)">{notice}</p>}

      <button
        type="submit"
        disabled={verify.isPending}
        className="w-full rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/20 hover:bg-(--brand-dark) disabled:opacity-60"
      >
        {verify.isPending ? "Confirming…" : "Confirm and sign in"}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={wait > 0 || resend.isPending}
          className="font-semibold text-(--brand-ink) hover:underline disabled:cursor-not-allowed disabled:text-(--ink)/40 disabled:no-underline"
        >
          {resend.isPending ? "Sending…" : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        </button>
        {onBack && (
          <button type="button" onClick={onBack} className="text-(--ink)/60 hover:text-(--ink) hover:underline">
            {backLabel}
          </button>
        )}
      </div>
    </form>
  );
}
