import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import RolesSyncPage from "./RolesSyncPage";

export default function RolesPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Roles &amp; permissions</h1>
        <p className="mt-0.5 text-sm text-(--text-muted)">
          What each role can do.
        </p>
      </div>
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <RolesSyncPage />
      </Suspense>
    </div>
  );
}
