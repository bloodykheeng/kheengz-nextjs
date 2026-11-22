import type { Metadata } from "next";
import { Suspense } from "react";
import { VendorRecordSkeleton } from "@/components/dashboard/RecordSkeleton";
import VendorHome from "./VendorHome";

export const metadata: Metadata = { title: "My business" };

export default function VendorPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<VendorRecordSkeleton />}>
        <VendorHome />
      </Suspense>
    </div>
  );
}
