import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import BrandingPanel from "../BrandingPanel";
import Logo from "@/components/brand/Logo";
import LoginRowForm from "./RowForm";
import { APP_NAME } from "@/lib/brand";

/** The platform on the left, the form on the right. A phone keeps the mark and a way back. */
export default function Login() {
  return (
    <div className="flex min-h-dvh bg-(--cream) text-(--ink)">
      <BrandingPanel />

      <div className="flex flex-1 flex-col">
        <div aria-hidden className="flex h-1.5 lg:hidden">
          <span className="flex-1 bg-(--brand)" />
          <span className="w-1/4 bg-(--accent-mid)" />
        </div>

        <div className="flex items-center justify-between px-6 pt-6 sm:px-10">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-(--ink)/60 transition-colors hover:text-(--brand-ink)">
            <MdArrowBack aria-hidden className="text-base" />
            Back to {APP_NAME}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-14 sm:px-10">
          <div className="w-full max-w-100">
            <Logo className="mb-10 lg:hidden" />
            <LoginRowForm />
            <p className="mt-6 text-center text-sm text-(--ink)/60">
              Want to sell?{" "}
              <Link href="/sell" className="font-semibold text-(--brand-ink) hover:underline">
                Apply to sell on {APP_NAME}
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-(--ink)/60">
              Shopping? You do not need an account.{" "}
              <Link href="/" className="font-semibold text-(--brand-ink) hover:underline">
                Go to the shops
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
