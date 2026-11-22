import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsList from "./ProductsList";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      {/* It reads the address (useParams): in its own boundary, so the shell is prerendered. */}
      <Suspense>
        <ProductsList />
      </Suspense>
    </div>
  );
}
