import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import UnitsList from "./UnitsList";

export const metadata: Metadata = { title: "Units" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <UnitsList />
      </Suspense>
    </div>
  );
}
