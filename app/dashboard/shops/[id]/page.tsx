import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopRecordSkeleton } from "@/components/dashboard/RecordSkeleton";
import ShopWorkspace from "./ShopWorkspace";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ShopRecordSkeleton />}>
        <ShopWorkspace />
      </Suspense>
    </div>
  );
}
