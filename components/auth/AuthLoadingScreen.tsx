"use client";

import { LogoMark } from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/brand";

/**
 * Full-screen branded cover shown while the signed-in profile (and its permissions)
 * settles, so no page shows before auth is ready (the shell renders hidden beneath it).
 *
 * This is what stops the dashboard rendering for a frame with empty permissions, a
 * sidebar that appears blank and then fills in reads as a broken app, not a fast one.
 */
export default function AuthLoadingScreen() {
  return (
    <div role="status" aria-label="Loading" className="fixed inset-0 z-1200 flex h-dvh flex-col items-center justify-center gap-6 bg-(--bg-page)">
      <LogoMark className="h-14 w-14 animate-pulse" />
      <p className="text-sm font-semibold tracking-wide text-(--text-secondary)">{APP_NAME}</p>
      <span className="pi pi-spin pi-spinner text-2xl text-(--text-muted)" />
    </div>
  );
}
