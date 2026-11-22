import type { Metadata } from "next";
import { Suspense } from "react";
import CategoryRequestsList from "./CategoryRequestsList";

export const metadata: Metadata = { title: "Category requests" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense>
        <CategoryRequestsList />
      </Suspense>
    </div>
  );
}
