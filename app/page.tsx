import Link from "next/link";
import Logo from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/brand";

const PROMISES = [
  { icon: "pi-bolt", title: "Buy in a minute", body: "Buy now or fill a cart. No account, no password: your phone number is enough." },
  { icon: "pi-wallet", title: "Pay how you like", body: "MTN or Airtel Mobile Money, or cash when your order arrives." },
  { icon: "pi-truck", title: "Delivered by boda", body: "Each shop sends your order with its own rider. Track it with your phone and order number." },
];

/**
 * The storefront's front door. Static, so it is served from the prerendered shell (Cache
 * Components) and opens fast on mobile data. Our own Tailwind only, never PrimeReact (CLAUDE.md).
 * Shops, products and search arrive with the storefront module (Phase 1).
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-(--cream) text-(--ink)">
      <header className="border-b border-(--ink)/10">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-(--brand-ink) transition-colors hover:bg-(--brand-light)"
          >
            Sell here? Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--accent)">Shops near you, open all day</p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Order from local shops. <span className="text-(--brand-ink)">Pay on delivery.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-(--ink)/70 sm:text-lg">
            Household goods, phones, groceries, fashion and hardware from sellers you can trust, brought to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-(--brand) px-5 text-sm font-semibold text-white">
              <span className="pi pi-clock" aria-hidden />
              The first shops open soon
            </span>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-3 sm:px-6">
          {PROMISES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-(--ink)/10 bg-white/60 p-5 dark:bg-white/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--brand-light) text-(--brand-ink)">
                <span className={`pi ${p.icon}`} aria-hidden />
              </span>
              <h2 className="mt-3 font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-(--ink)/65">{p.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-(--ink)/10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-(--ink)/55 sm:px-6">{APP_NAME}</div>
      </footer>
    </div>
  );
}
