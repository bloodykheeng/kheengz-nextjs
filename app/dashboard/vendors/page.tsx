import type { Metadata } from "next";
import { Suspense } from "react";
import VendorsList from "./VendorsList";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <VendorsList />
      </Suspense>
    </div>
  );
}
