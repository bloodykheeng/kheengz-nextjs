import type { Metadata } from "next";
import { Suspense } from "react";
import ShopsList from "./ShopsList";

export const metadata: Metadata = { title: "Shops" };

export default function ShopsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <ShopsList />
      </Suspense>
    </div>
  );
}
