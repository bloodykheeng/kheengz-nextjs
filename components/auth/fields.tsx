/**
 * The sign-in pages' own field look (warm ivory, green focus ring), shared by sign-in, password
 * reset and "Sell on Kheengz" so the three read as one place. Dashboards use PrimeReact's fields
 * and `Field` from components/dashboard/ui.tsx instead.
 */

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">
      {msg}
    </p>
  );
}

export function inputCls(error?: boolean) {
  return [
    "w-full rounded-lg border bg-(--cream-deep) py-2.5 text-sm text-(--ink)",
    "placeholder:text-(--ink)/55 outline-none transition-all",
    error
      ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
      : "border-(--brand)/20 focus:border-(--brand) focus:ring-2 focus:ring-(--brand-ring)",
  ].join(" ");
}
