"use client";

import PageError from "@/components/common/PageError";

/**
 * A storefront or sign-in page that crashes while drawing shows this, never the bare white "Application error"
 * screen (docs/dashboard-patterns.md §18). The dashboard has its own.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError error={error} retry={retry} homeHref="/" />;
}
