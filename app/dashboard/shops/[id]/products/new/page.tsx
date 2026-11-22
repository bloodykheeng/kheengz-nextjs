import type { Metadata } from "next";
import { Suspense } from "react";
import NewProduct from "./NewProduct";

export const metadata: Metadata = { title: "New product" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      {/* It reads the address (useParams): in its own boundary, so the shell is prerendered. */}
      <Suspense>
        <NewProduct />
      </Suspense>
    </div>
  );
}
