import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import ShopsList from "./ShopsList";

export const metadata: Metadata = { title: "Shops" };

export default function ShopsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <ShopsList />
      </Suspense>
    </div>
  );
}
