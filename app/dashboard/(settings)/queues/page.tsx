import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import QueueTabsPage from "./QueueTabsPage";

export default function QueuesPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Queues</h1>
        <p className="mt-0.5 text-sm text-(--text-muted)">
          Background jobs waiting to run, and the ones that failed.
        </p>
      </div>
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <QueueTabsPage />
      </Suspense>
    </div>
  );
}
