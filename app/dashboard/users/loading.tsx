import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";

/** Shown at once while this page's code and data arrive, in its shape: never a blank page (docs/dashboard-patterns.md §19). */
export default function Loading() {
  return (
    <ListPageSkeleton />
  );
}
