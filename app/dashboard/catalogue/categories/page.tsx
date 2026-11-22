import type { Metadata } from "next";
import { Suspense } from "react";
import CategoriesTree from "./CategoriesTree";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <CategoriesTree />
      </Suspense>
    </div>
  );
}
