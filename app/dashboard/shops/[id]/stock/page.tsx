import type { Metadata } from "next";
import { Suspense } from "react";
import ShopStock from "./ShopStock";

export const metadata: Metadata = { title: "Stock" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      {/* It reads the address (useParams): in its own boundary, so the shell is prerendered. */}
      <Suspense>
        <ShopStock />
      </Suspense>
    </div>
  );
}
