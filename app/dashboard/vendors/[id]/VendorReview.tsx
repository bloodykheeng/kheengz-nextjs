"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, PageHeader, StatusTag } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import VendorDetailsCard from "@/components/dashboard/vendors/VendorDetailsCard";
import VendorDocumentsCard from "@/components/dashboard/vendors/VendorDocumentsCard";
import PayoutDestinationsCard, { ReasonDialog } from "@/components/dashboard/vendors/PayoutDestinationsCard";
import VendorMembersCard from "@/components/dashboard/vendors/VendorMembersCard";
import { useBreadcrumbTitle } from "@/contexts/BreadcrumbContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { usePermissions } from "@/hooks/usePermissions";
import { decideVendor, getVendor, type VendorDecision } from "@/services/vendors/vendors-service";
import type { Vendor } from "@/services/types/kheengz";
import { VendorRecordSkeleton } from "@/components/dashboard/RecordSkeleton";

/**
 * A vendor, for reviewers (D35): the details and papers to check, payout destinations waiting, the
 * people and shops, and the decision. Approving is refused by the API while papers are missing.
 */
export default function VendorReview() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const query = useQuery({ queryKey: ["vendor", id], queryFn: () => getVendor(id) });
  const vendor = query.data;
  useBreadcrumbTitle(vendor?.name);

  if (query.isPending || !vendor) return <VendorRecordSkeleton />;

  const decides = can("manage vendors");
  const mode = decides ? "reviewer" : "member";

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{vendor.name} <StatusTag status={vendor.status} raw /></span>}
        subtitle={vendor.status_reason ? `${vendor.status}: ${vendor.status_reason}` : "Check the papers against the details, then decide."}
        actions={decides ? <Decisions vendor={vendor} /> : undefined}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <VendorDetailsCard vendor={vendor} editable={false} />
        <VendorDocumentsCard vendor={vendor} mode={mode} />
        <PayoutDestinationsCard vendor={vendor} mode={mode} />
        <ShopsCard vendor={vendor} />
        <VendorMembersCard vendor={vendor} mode={mode} />
      </div>
    </div>
  );
}

function Decisions({ vendor }: { vendor: Vendor }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<null | { decision: VendorDecision; header: string; label: string }>(null);
  const decide = useMutation({
    mutationFn: ({ decision, reason }: { decision: VendorDecision; reason?: string }) => decideVendor(vendor.id, decision, reason),
    onSuccess: async (response) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] }), queryClient.invalidateQueries({ queryKey: ["vendors"] })]);
      toast.success(response.message);
    },
  });
  const missing = vendor.missing_documents ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {vendor.status === "Pending" && (
        <>
          <Button
            icon="pi pi-check"
            severity="success"
            label="Approve"
            disabled={missing.length > 0}
            tooltip={missing.length ? `Still missing: ${missing.join(", ")}` : undefined}
            tooltipOptions={{ showOnDisabled: true, position: "bottom" }}
            loading={decide.isPending && decide.variables?.decision === "approve"}
            onClick={() => confirmAction({ header: `Approve ${vendor.name}?`, message: "Their shops can then open, each once you review it.", acceptLabel: "Approve", accept: () => decide.mutateAsync({ decision: "approve" }) })}
          />
          <Button icon="pi pi-times" outlined severity="danger" label="Reject" onClick={() => setAsking({ decision: "reject", header: `Reject ${vendor.name}?`, label: "Reject" })} />
        </>
      )}
      {vendor.status === "Approved" && (
        <Button icon="pi pi-ban" outlined severity="danger" label="Suspend" onClick={() => setAsking({ decision: "suspend", header: `Suspend ${vendor.name}? All their shops close.`, label: "Suspend" })} />
      )}
      {vendor.status === "Suspended" && (
        <Button icon="pi pi-play" severity="success" label="Reinstate"
          onClick={() => confirmAction({ header: `Reinstate ${vendor.name}?`, message: "Each of their shops comes back as it was.", acceptLabel: "Reinstate", accept: () => decide.mutateAsync({ decision: "reinstate" }) })} />
      )}
      <ReasonDialog
        visible={!!asking}
        header={asking?.header ?? ""}
        prompt="The vendor reads this by SMS and email. Say what is wrong and what to do."
        acceptLabel={asking?.label ?? ""}
        onHide={() => setAsking(null)}
        onSubmit={(reason) => decide.mutateAsync({ decision: asking!.decision, reason })}
      />
    </div>
  );
}

function ShopsCard({ vendor }: { vendor: Vendor }) {
  const shops = vendor.shops ?? [];
  return (
    <Card title={`Shops (${shops.length})`}>
      {shops.length === 0 ? (
        <EmptyState icon="pi-shop" title="No shop yet" />
      ) : (
        <ul className="divide-y divide-(--border-color)">
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/shops/${s.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2.5 hover:text-(--brand-ink)">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-(--text-muted)">{s.address} · {s.shop_type}</span>
                </span>
                <StatusTag status={s.status} raw />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
