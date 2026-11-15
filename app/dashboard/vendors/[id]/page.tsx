import type { Metadata } from "next";
import { Suspense } from "react";
import VendorReview from "./VendorReview";

export const metadata: Metadata = { title: "Vendor" };

export default function VendorReviewPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <VendorReview />
      </Suspense>
    </div>
  );
}
