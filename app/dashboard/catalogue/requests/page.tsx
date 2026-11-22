import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import CategoryRequestsList from "./CategoryRequestsList";

export const metadata: Metadata = { title: "Category requests" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <CategoryRequestsList />
      </Suspense>
    </div>
  );
}
