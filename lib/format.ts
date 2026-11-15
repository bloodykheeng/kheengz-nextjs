/**
 * How the platform writes money, dates and names on screen.
 *
 * Money is whole Ugandan shillings: never decimals. Dates are stored in UTC
 * and shown in the viewer's own clock, which for nearly everyone is Kampala.
 */

const ugxFormatter = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** `250000` to `UGX 250,000`. */
export function ugx(amount: number | null | undefined): string {
  return `UGX ${ugxFormatter.format(Math.round(amount ?? 0))}`;
}

/** `250000` to `250,000`, for inputs and tight table cells. */
export function num(amount: number | null | undefined): string {
  return ugxFormatter.format(Math.round(amount ?? 0));
}

/** `1250000` to `UGX 1.25M`, for chart axes and stat tiles. */
export function ugxShort(amount: number | null | undefined): string {
  const n = amount ?? 0;
  if (n >= 1_000_000_000) return `UGX ${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 10_000) return `UGX ${Math.round(n / 1000)}K`;
  return ugx(n);
}

/** The clock events are planned in. The server renders in UTC, so server-side dates pass it to `longDate`. */
export const BUSINESS_TIMEZONE = "Africa/Kampala";

/** Saturday, 12 December 2026. In the viewer's clock, or in `timeZone` when given (link previews, metadata). */
export function longDate(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

/** 12 Dec 2026 */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** 12 Dec 2026, 14:05 */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 2:00 PM */
export function timeOfDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** "3 minutes ago", "yesterday", "12 Dec". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(iso);
}

/** Days until a date; negative once it has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

/** "Aisha Namutebi" to "AN". */
export function initials(name: string | null | undefined): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Percentage of a target reached, 0 to 100, one decimal. */
export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 1000) / 10);
}

/** `0772123456` to `0772 123 456` as the buyer types. */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (digits.startsWith("256")) return digits;
  return digits.replace(/^(\d{4})(\d{0,3})(\d{0,3}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
}

/** The network a Ugandan number most likely belongs to, from its prefix. */
export function guessNetwork(phone: string): "MTN" | "Airtel" | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  const prefix = local.slice(0, 2);
  if (["76", "77", "78", "79"].includes(prefix)) return "MTN";
  if (["70", "74", "75"].includes(prefix)) return "Airtel";
  return null;
}

/** Whether the buyer typed an MTN or Airtel Uganda mobile. */
export function isUgandanMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^7\d{8}$/.test(local);
}
