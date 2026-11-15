import { z } from "zod";
import type { AxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isValidPhone, PHONE_HINT, toPhoneDigits } from "@/lib/phone";
import { APP_NAME } from "@/lib/brand";

/**
 * The rules every dashboard form validates with (react-hook-form + zod, as in Alpha). A form
 * builds its schema from these, so "required", a phone, a Mobile Money number and an amount
 * read and behave the same everywhere. The API checks everything again; these only stop a
 * form that cannot succeed from being sent, or confirmed.
 *
 * See docs/dashboard-patterns.md, "Forms".
 */

/**
 * Pass to every `.superRefine(fn, ALWAYS)`. By default zod skips an object's refinements while
 * any field has already failed, so a first Save showed the empty-amount error but not "Choose
 * the account." (the account check lives in the refinement). With this the form lists every
 * problem at once. The refinement then sees the raw values, so it must not assume they passed.
 */
export const ALWAYS = { when: () => true } as const;

/** Text that must be filled in. */
export const requiredText = (message: string, min = 1) => z.string().trim().min(min, message);

/** Text that may be left empty. */
export const optionalText = (max = 2000) => z.string().trim().max(max, `Keep it under ${max} characters.`);

/** A whole UGX amount of at least `min`. Empty inputs arrive as null. */
export const amount = (message: string, min = 1) =>
  z.number({ error: message }).int().min(min, min > 1 ? `At least UGX ${min.toLocaleString("en-US")}.` : message);

/** An email address, or empty when `required` is false. */
export const email = (required = true) =>
  required
    ? z.string().trim().min(1, "Enter the email address.").email("Enter a valid email address.")
    : z.string().trim().email("Enter a valid email address.").or(z.literal(""));

/** Any country's number: digits with the country code, no "+" (what PhoneField gives). */
export const phone = (required = true) =>
  required
    ? z.string().trim().min(1, "Enter the phone number.").refine(isValidPhone, PHONE_HINT)
    : z.string().trim().refine((v) => !v || isValidPhone(v), PHONE_HINT);

/**
 * A phone typed into a plain box (no country picker), the way people write it: a Ugandan mobile as
 * 0772 123 456 or with 256, or any number with its country code. Send `toPhoneDigits(value)`.
 */
export const typedPhone = () =>
  z.string().trim().min(1, "Enter the phone number.").refine((v) => isValidPhone(toPhoneDigits(v)), "Enter your phone number, like 0772 123 456, or with its country code.");

/** The only numbers Mobile Money pays and SMS reaches: an MTN or Airtel Uganda mobile, 2567XXXXXXXX. */
export const UG_MOBILE_HINT = "Enter an MTN or Airtel Uganda number, like 0772 123 456.";
export const isUgMobileDigits = (v: string) => /^2567[0-9]{8}$/.test(v) && ["70", "74", "75", "76", "77", "78", "79"].includes(v.slice(3, 5));
export const ugMobile = () => z.string().trim().min(1, "Enter the Mobile Money number.").refine(isUgMobileDigits, UG_MOBILE_HINT);

/** A moment that has already happened (a payment, a posting). */
export const pastMoment = (message: string) =>
  z.date({ error: message }).refine((d) => d.getTime() <= Date.now() + 60_000, "The date cannot be in the future.");

/** Every API failure's body: `{ message, errors: { field: [...] } }`, and a `code` where a screen must branch on it. */
export type ApiErrorBody = { message?: string; errors?: Record<string, string[]>; code?: string; data?: { email?: string } };

/**
 * Laravel's 422 onto the form: each `errors.field` message lands under its own field (red
 * border and all), so server-only rules (an email already taken, a balance gone down) read
 * the same as the schema's. Returns the general message when nothing matched a field.
 *
 *   onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "email"]))
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** The form's fields named as the API names them, or a map from the API's name to the form's. */
  fields: readonly Path<T>[] | Partial<Record<string, Path<T>>>,
): string | null {
  const body = (error as AxiosError<ApiErrorBody>)?.response?.data;
  if (!body) return `Could not reach ${APP_NAME}. Check your connection and try again.`;
  const target = (key: string): Path<T> | undefined =>
    Array.isArray(fields) ? ((fields as readonly string[]).includes(key) ? (key as Path<T>) : undefined) : (fields as Partial<Record<string, Path<T>>>)[key];
  let placed = false;
  Object.entries(body.errors ?? {}).forEach(([key, messages]) => {
    const field = target(key);
    if (field) {
      setError(field, { type: "server", message: messages[0] });
      placed = true;
    }
  });
  if (placed) return null;
  const first = Object.values(body.errors ?? {})[0]?.[0];
  return first ?? body.message ?? "Something went wrong. Try again.";
}
