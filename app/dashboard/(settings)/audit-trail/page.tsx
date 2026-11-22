import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import RecordsList from "./RecordsList";

export default function AuditTrailPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Audit trail</h1>
        <p className="mt-0.5 text-sm text-(--text-muted)">
          Every recorded action, who did it and what changed.
        </p>
      </div>
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <RecordsList />
      </Suspense>
      {/* The places come from DB-IP City Lite, whose free licence (CC BY 4.0) asks for this link on
          every page that shows them (workspace decision D29). */}
      <p className="text-xs text-(--text-muted)">
        <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
          IP Geolocation by DB-IP
        </a>
      </p>
    </div>
  );
}
