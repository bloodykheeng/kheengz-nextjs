"use client";

import type { ApiErrorBody } from "@/lib/validation";

import { useMemo, useState } from "react";
import { useTimeGreeting } from "@/hooks/useTimeGreeting";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAppRouter } from "@/hooks/useAppRouter";
import Link from "next/link";
import { MdLockOutline, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { postToLogin } from "@/services/auth/auth-service";
import VerifyEmailStep from "@/components/auth/VerifyEmailStep";
import type { LoginResponse } from "@/services/types/auth";
import type { AxiosError, AxiosResponse } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import CredentialInput, { looksLikePhone } from "@/components/auth/CredentialInput";
import { isValidPhone, PHONE_HINT } from "@/lib/phone";
import { clearRememberedAccount, setRememberedAccount, useRememberedAccount } from "@/lib/rememberedAccount";
import { FieldError, inputCls } from "@/components/auth/fields";

// Schema

const schema = z.object({
  // A phone is checked here rather than left to the server, which can only answer
  // "credentials are incorrect": useless for a number that is merely incomplete.
  email: z
    .string()
    .min(1, "Enter your email, phone number or username")
    .refine((v) => !looksLikePhone(v) || isValidPhone(v), PHONE_HINT),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// Component

export default function LoginRowForm() {
  const router = useAppRouter();
  const { login } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Signed up but never confirmed: the API sent a fresh code; ask for it here.
  const [verifying, setVerifying] = useState<string | null>(null);

  // Identity-remember (opt-in): a returning user on this device gets a "welcome back"
  // greeting and a pre-filled identifier. Only a name/email hint is stored, never a token,
  // so full authentication still happens every time. Null on the server, filled in by the
  // browser after hydration (lib/rememberedAccount.ts).
  const remembered = useRememberedAccount();
  const timeOfDay = useTimeGreeting();
  const firstName = remembered?.name.trim().split(/\s+/)[0] ?? "";
  const greeting = remembered ? (firstName ? `Welcome back, ${firstName}` : "Welcome back") : timeOfDay;

  // The remembered identifier fills the form, and forgetting it empties it again. What the
  // person has typed in the meantime is kept (keepDirtyValues).
  const formValues = useMemo<FormData>(
    () => ({ email: remembered?.email ?? "", password: "", rememberMe: !!remembered }),
    [remembered],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), values: formValues, resetOptions: { keepDirtyValues: true } });

  const forgetMe = () => clearRememberedAccount();

  const { mutate, isPending } = useMutation<AxiosResponse<LoginResponse>, AxiosError<ApiErrorBody>, FormData>({
    mutationFn: (data: FormData) =>
      postToLogin({ email: data.email, password: data.password }),
    onSuccess: (response, variables) => {
      const user = response.data.user;

      if (variables.rememberMe) {
        setRememberedAccount({ email: variables.email, name: user.name });
      } else {
        clearRememberedAccount();
      }

      login(user, response.data.token);
      router.push("/dashboard");
    },
    // Reported inline in this form (see `serverError`), so the global handler in
    // TanstackContext must stay quiet or the same message appears twice.
    meta: { skipGlobalError: true },
    onError: (err: AxiosError<ApiErrorBody>) => {
      if (err?.response?.status === 403 && err?.response?.data?.code === "email_unverified") {
        setVerifying(err.response.data.data?.email ?? null);
        return;
      }
      const msg =
        err?.response?.data?.message ?? "Invalid credentials. Please try again.";
      setServerError(msg);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    mutate(data);
  };

  if (verifying) {
    return (
      <VerifyEmailStep
        email={verifying}
        backLabel="Back to sign in"
        onBack={() => setVerifying(null)}
        onVerified={(response) => {
          login(response.data.user, response.data.token);
          router.push("/dashboard");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* The greeting is the browser's (see above), so the server and client agree. */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-(--ink)">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-(--ink)/55">
          {remembered ? (
            <>
              Not you?{" "}
              <button
                type="button"
                onClick={forgetMe}
                className="font-medium text-(--brand-ink) hover:underline"
              >
                Use another account
              </button>
            </>
          ) : (
            "Sign in to run your shop or the marketplace"
          )}
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
        >
          {serverError}
        </div>
      )}

      {/* Email / Phone, one box that becomes a phone input the moment you type a digit. */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-(--ink)">
          Email, phone or username
        </label>
        <Controller
          name="email"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <CredentialInput
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              invalid={!!errors.email}
              disabled={isPending}
            />
          )}
        />
        <FieldError msg={errors.email?.message} />
      </div>

      {/* Password */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-(--ink)">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-(--brand-ink) hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <MdLockOutline className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55" />
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isPending}
            className={`${inputCls(!!errors.password)} pl-9 pr-10 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            disabled={isPending}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-(--ink)/55 transition-colors hover:text-(--ink) disabled:opacity-50"
          >
            {showPw ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
        <FieldError msg={errors.password?.message} />
      </div>

      {/* Remember me */}
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          {...register("rememberMe")}
          type="checkbox"
          disabled={isPending}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-(--brand) border-(--brand)/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="select-none text-sm text-(--ink)/75">
          Remember me for 7 days
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-(--brand) py-3 text-sm font-bold text-white transition-colors hover:bg-(--brand-mid) active:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
