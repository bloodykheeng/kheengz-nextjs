"use client";

import PageError from "@/components/common/PageError";

/**
 * A dashboard page that crashes while drawing shows this inside the frame (sidebar and header stay), never the bare
 * white "Application error" screen (docs/dashboard-patterns.md §18).
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError error={error} retry={retry} homeHref="/dashboard" />;
}
