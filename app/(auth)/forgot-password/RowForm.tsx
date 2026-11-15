"use client";

import type { ApiErrorBody } from "@/lib/validation";

import type { AxiosError } from "axios";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import {
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
  MdCheckCircleOutline,
} from "react-icons/md";
import CredentialInput, { looksLikePhone } from "@/components/auth/CredentialInput";
import { isValidPhone, PHONE_HINT } from "@/lib/phone";
import {
  postOtpRequest,
  postOtpValidate,
  postOtpResetPassword,
} from "@/services/auth/auth-service";

// Shared helpers

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">
      {msg}
    </p>
  );
}

function ServerError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
    >
      {msg}
    </div>
  );
}

function inputCls(error?: boolean) {
  return [
    "w-full rounded-lg border bg-(--cream-deep) py-2.5 text-sm text-(--ink)",
    "placeholder:text-(--ink)/55 outline-none transition-all",
    error
      ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
      : "border-(--brand)/20 focus:border-(--brand) focus:ring-2 focus:ring-(--brand-ring)",
  ].join(" ");
}

// Step indicator

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Identify account", "Verify code", "New password"];
  return (
    <div className="mb-6 flex items-center gap-0">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-(--brand) text-white"
                    : "bg-(--bg-subtle) text-(--ink)/55 border border-(--brand)/20",
                ].join(" ")}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={[
                  "mt-1 text-[10px] font-medium whitespace-nowrap",
                  active ? "text-(--brand-ink)" : "text-(--ink)/55",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "mx-1 mb-4 h-px flex-1 transition-colors",
                  done ? "bg-green-400" : "bg-(--border-color)",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Step 1: Identify account

const step1Schema = z.object({
  // A phone is checked here rather than left to the server, which can only answer
  // "no account found": useless for a number that is merely incomplete.
  credential: z
    .string()
    .min(1, "Enter your email, phone number or username")
    .refine((v) => !looksLikePhone(v) || isValidPhone(v), PHONE_HINT),
});
type Step1Data = z.infer<typeof step1Schema>;

function Step1Form({ onSuccess }: { onSuccess: (credential: string, sentNote: string) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { credential: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Step1Data) => postOtpRequest({ email: d.credential }),
    // The API says where the code went (email, phone or both) and for how long.
    onSuccess: (res, variables) => onSuccess(variables.credential, res.data?.message ?? ""),
    // Reported inline in this form (see `serverError`), so the global handler in
    // TanstackContext must stay quiet or the same message appears twice.
    meta: { skipGlobalError: true },
    onError: (err: AxiosError<ApiErrorBody>) => {
      setServerError(
        err?.response?.data?.message ?? "Something went wrong. Please try again."
      );
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => { setServerError(null); mutate(d); })}
      noValidate
      className="space-y-5"
    >
      <ServerError msg={serverError} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-(--ink)">
          Email or Phone Number
        </label>
        {/* Same one-box control as login: type a digit and it becomes a phone input. */}
        <Controller
          name="credential"
          control={control}
          render={({ field }) => (
            <CredentialInput
              name="fp-credential"
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.credential}
              disabled={isPending}
            />
          )}
        />
        <FieldError msg={errors.credential?.message} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-(--brand) py-3 text-sm font-bold text-white transition-colors hover:bg-(--brand-mid) active:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending code…" : "Send Reset Code"}
      </button>
    </form>
  );
}

// Step 2: Enter OTP

const step2Schema = z.object({
  otp: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be digits only"),
});
type Step2Data = z.infer<typeof step2Schema>;

function Step2Form({
  credential,
  sentNote,
  onSuccess,
  onBack,
}: {
  credential: string;
  sentNote: string;
  onSuccess: (otp: string) => void;
  onBack: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Step2Data) => postOtpValidate({ email: credential, otp: d.otp }),
    onSuccess: (_, variables) => onSuccess(variables.otp),
    // Reported inline in this form (see `serverError`), so the global handler in
    // TanstackContext must stay quiet or the same message appears twice.
    meta: { skipGlobalError: true },
    onError: (err: AxiosError<ApiErrorBody>) => {
      setServerError(
        err?.response?.data?.message ??
          "Invalid or expired code. Please try again."
      );
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => { setServerError(null); mutate(d); })}
      noValidate
      className="space-y-5"
    >
      <div className="rounded-lg border border-(--brand)/20 bg-(--rose) px-4 py-3 text-sm text-(--brand-dark) dark:border-(--brand)/40 dark:bg-(--rose) dark:text-(--accent-mid)">
        {sentNote || (
          <>
            A 6-digit code was sent for <span className="font-semibold">{credential}</span>.
          </>
        )}
      </div>
      <ServerError msg={serverError} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-(--ink)">
          Verification code
        </label>
        <input
          {...register("otp")}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter the code"
          autoComplete="one-time-code"
          className={`${inputCls(!!errors.otp)} px-4 text-center text-lg tracking-[0.5em]`}
        />
        <FieldError msg={errors.otp?.message} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-(--brand) py-3 text-sm font-bold text-white transition-colors hover:bg-(--brand-mid) active:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Verifying…" : "Verify Code"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-(--ink)/55 transition-colors hover:text-(--ink)"
      >
        ← Use a different email, phone or username
      </button>
    </form>
  );
}

// Step 3: New password

const step3Schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });
type Step3Data = z.infer<typeof step3Schema>;

function Step3Form({
  credential,
  otp,
  onSuccess,
}: {
  credential: string;
  otp: string;
  onSuccess: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: Step3Data) =>
      postOtpResetPassword({ email: credential, otp, ...d }),
    onSuccess,
    // Reported inline in this form (see `serverError`), so the global handler in
    // TanstackContext must stay quiet or the same message appears twice.
    meta: { skipGlobalError: true },
    onError: (err: AxiosError<ApiErrorBody>) => {
      setServerError(
        err?.response?.data?.message ??
          "Failed to reset password. Please try again."
      );
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => { setServerError(null); mutate(d); })}
      noValidate
      className="space-y-5"
    >
      <ServerError msg={serverError} />

      {/* New password */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-(--ink)">
          New password
        </label>
        <div className="relative">
          <MdLockOutline className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55" />
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className={`${inputCls(!!errors.password)} pl-9 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide" : "Show"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55 transition-colors hover:text-(--ink)"
          >
            {showPw ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
        <FieldError msg={errors.password?.message} />
      </div>

      {/* Confirm password */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-(--ink)">
          Confirm password
        </label>
        <div className="relative">
          <MdLockOutline className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55" />
          <input
            {...register("password_confirmation")}
            type={showConfirm ? "text" : "password"}
            placeholder="Repeat your new password"
            autoComplete="new-password"
            className={`${inputCls(!!errors.password_confirmation)} pl-9 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide" : "Show"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55 transition-colors hover:text-(--ink)"
          >
            {showConfirm ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
        <FieldError msg={errors.password_confirmation?.message} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-(--brand) py-3 text-sm font-bold text-white transition-colors hover:bg-(--brand-mid) active:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  );
}

// Success view

function SuccessView() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/login"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 text-center dark:border-green-900/40 dark:bg-green-900/10">
      <MdCheckCircleOutline className="mx-auto mb-3 text-4xl text-green-600 dark:text-green-400" />
      <p className="text-sm font-semibold text-(--ink)">
        Password reset successfully
      </p>
      <p className="mt-1.5 text-xs text-(--ink)/55">
        Redirecting you to sign in…
      </p>
    </div>
  );
}

// Root

export default function ForgotPasswordRowForm() {
  const [step, setStep] = useState<1 | 2 | 3 | "done">(1);
  const [credential, setCredential] = useState("");
  const [otp, setOtp] = useState("");
  const [sentNote, setSentNote] = useState("");

  if (step === "done") return <SuccessView />;

  return (
    <>
      <StepIndicator current={step as 1 | 2 | 3} />

      {step === 1 && (
        <Step1Form
          onSuccess={(cred, note) => {
            setCredential(cred);
            setSentNote(note);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2Form
          credential={credential}
          sentNote={sentNote}
          onSuccess={(validatedOtp) => {
            setOtp(validatedOtp);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3Form
          credential={credential}
          otp={otp}
          onSuccess={() => setStep("done")}
        />
      )}
    </>
  );
}
