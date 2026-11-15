"use client";

import Link from "next/link";
import { MdArrowBack, MdSearchOff } from "react-icons/md";
import { APP_NAME } from "@/lib/brand";

export default function NotFound() {
  // A soft back from the global not-found boundary lands on a page whose route
  // tree is restored from cache but not re-hydrated, a known Next.js App Router
  // issue: the sidebar, header and hamburger handlers stay dead until a refresh.
  // So navigate back and force a full reload once it lands.
  const goBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length <= 1) {
      window.location.assign(new URL("/", window.location.origin).href);
      return;
    }
    window.addEventListener("popstate", () => window.location.reload(), { once: true });
    window.history.back();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--bg-page) px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-(--rose) text-(--brand)">
          <MdSearchOff className="text-4xl" />
        </div>

        {/* 404 */}
        <p className="text-sm font-semibold uppercase tracking-widest text-(--brand)">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-(--text-primary)">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-(--text-muted)">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the address or go back to the home page.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--brand-mid)"
          >
            Go to the home page
          </Link>
          <button
            onClick={goBack}
            className="flex items-center gap-2 rounded-lg border border-(--border-color) bg-(--bg-card) px-5 py-2.5 text-sm font-semibold text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg)"
          >
            <MdArrowBack className="text-base" />
            Go back
          </button>
        </div>

        {/* Branding */}
        <p className="mt-12 text-xs text-(--text-muted)">
          {APP_NAME}
        </p>
      </div>
    </div>
  );
}
