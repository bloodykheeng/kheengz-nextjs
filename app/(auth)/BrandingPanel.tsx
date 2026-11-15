import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/brand";

const POINTS = [
  "Orders arrive live, paid by Mobile Money or cash on delivery",
  "Your money is sent to your Mobile Money or bank as each order is paid",
  "Stock, walk-in sales and your boda deliveries in one place",
];

/** Beside the sign-in form: the platform's green, a gold rule, and what signing in is for. */
export default function BrandingPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#147a5a,#0e5e45_55%,#0a4433)] p-10 text-white dark:border-r dark:border-white/5 dark:bg-[linear-gradient(160deg,#123d2f,#0c261d_55%,#07150f)] lg:flex lg:w-[46%] xl:p-14">
      <div aria-hidden className="pointer-events-none absolute -right-28 top-1/4 h-120 w-120 rounded-full border-40 border-[#d9a21b]/12" />

      <Link href="/" className="relative z-10 flex items-center gap-3">
        <LogoMark className="h-11 w-11" />
        <span className="font-display text-3xl font-bold">{APP_NAME}</span>
      </Link>

      <div className="relative z-10 max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f0c75e]">For sellers and the team</p>
        <h1 className="font-display mt-3 text-5xl font-bold leading-[1.05] xl:text-6xl">
          Your shop, <span className="text-[#f0c75e]">open all day.</span>
        </h1>
        <ul className="mt-8 space-y-3 text-sm text-white/85">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="pi pi-check-circle text-[#f0c75e]" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/50">Buyers never need an account: they order with a phone number.</p>
    </div>
  );
}
