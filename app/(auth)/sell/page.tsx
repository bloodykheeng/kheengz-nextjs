import type { Metadata } from "next";
import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import BrandingPanel from "../BrandingPanel";
import Logo from "@/components/brand/Logo";
import SellForm from "./SellForm";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Sell with us" };

/** "Sell on Kheengz": the platform on the left, the application on the right, as on sign-in. */
export default function SellPage() {
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

        <div className="flex flex-1 justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-130">
            <Logo className="mb-8 lg:hidden" />
            <SellForm />
          </div>
        </div>
      </div>
    </div>
  );
}
