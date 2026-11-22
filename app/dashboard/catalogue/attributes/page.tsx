import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import AttributesList from "./AttributesList";

export const metadata: Metadata = { title: "Attributes" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <AttributesList />
      </Suspense>
    </div>
  );
}
