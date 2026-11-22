"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * What a page shows when it crashes while drawing (Next.js error.js), in place of the bare "Application error"
 * white screen (Letshego's, from Alpha's notes; docs/dashboard-patterns.md §18). The dashboard's frame (sidebar,
 * header) stays, so the person can try again or go elsewhere.
 *
 * A browser translator or extension that rewrites the page under React makes it fail with "Failed to execute
 * 'removeChild' / 'insertBefore' on 'Node'" (a NotFoundError): that case says so, since trying again only helps
 * once the translator is off.
 */
export function isDomTamperingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "NotFoundError" || /(removeChild|insertBefore).*not a child/i.test(error.message);
}

export default function PageError({ error, retry, homeHref }: { error: unknown; retry: () => void; homeHref: string }) {
  useEffect(() => {
    // Kept in production (removeConsole excludes errors): the browser console is where support finds it.
    console.error(error);
  }, [error]);

  const tampered = isDomTamperingError(error);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
      <div className="w-full max-w-lg rounded-2xl border border-(--border-color) bg-(--bg-card) p-6 text-center shadow-(--shadow-sm)">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <span className="pi pi-exclamation-triangle text-xl" aria-hidden />
        </span>
        <h2 className="m-0 text-lg font-semibold text-(--text-primary)">This page could not be shown</h2>
        <p className="m-0 mt-2 text-sm text-(--text-secondary)">
          {tampered
            ? "A browser translator or extension changed this page while it was open. Turn off translation for this site (or the extension), then try again."
            : "Something went wrong while showing this page. Nothing you saved is affected. Try again, or open it again from the menu."}
        </p>
        {digest && (
          <p className="m-0 mt-3 text-xs text-(--text-muted)">
            Reference: <span className="font-mono">{digest}</span>
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => retry()} className="cursor-pointer rounded-lg border-0 bg-(--brand) px-4 py-2 text-sm font-medium text-white hover:bg-(--brand-dark)">
            Try again
          </button>
          <Link href={homeHref} className="rounded-lg border border-(--border-color) px-4 py-2 text-sm font-medium text-(--text-primary) no-underline hover:bg-(--bg-page)">
            Go to the start page
          </Link>
        </div>
      </div>
    </div>
  );
}
