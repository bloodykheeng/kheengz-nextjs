"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, EmptyState, PageHeader, StatusTag } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import VendorDetailsCard from "@/components/dashboard/vendors/VendorDetailsCard";
import VendorDocumentsCard from "@/components/dashboard/vendors/VendorDocumentsCard";
import PayoutDestinationsCard from "@/components/dashboard/vendors/PayoutDestinationsCard";
import VendorMembersCard from "@/components/dashboard/vendors/VendorMembersCard";
import NewShopDialog from "@/components/dashboard/vendors/NewShopDialog";
import { useListParams } from "@/hooks/useListParams";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { getVendor, getVendors, resubmitVendor } from "@/services/vendors/vendors-service";
import type { Vendor } from "@/services/types/kheengz";

/**
 * A vendor's own business (D31, D35): where the application stands and what is still needed, the
 * details, papers, payout destinations, people and shops. Someone working for more than one vendor
 * picks which (kept in the URL as `vendor`).
 */
export default function VendorHome() {
  const { getParam, pushParams } = useListParams();
  const vendors = useQuery({ queryKey: ["vendors", "mine"], queryFn: () => getVendors({ per_page: 50 }) });
  const list = vendors.data?.data ?? [];
  const chosenId = getParam("vendor") || list[0]?.id;

  if (vendors.isPending) return <div className="h-64 animate-pulse rounded-2xl bg-(--bg-card)" role="status" aria-label="Loading" />;
  if (list.length === 0) {
    return (
      <EmptyState
        icon="pi-briefcase"
        title="You do not work for a vendor yet"
        body="Ask the business's Owner to add you, or apply to sell with your own business."
        action={<Link href="/sell" className="text-sm font-semibold text-(--brand-ink) hover:underline">Apply to sell</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      {list.length > 1 && (
        <Dropdown value={chosenId} options={list.map((v) => ({ label: v.name, value: v.id }))} onChange={(e) => pushParams({ vendor: e.value })} className="w-full sm:w-72" aria-label="Business" />
      )}
      {chosenId && <VendorWorkspace vendorId={chosenId} />}
    </div>
  );
}

function VendorWorkspace({ vendorId }: { vendorId: string }) {
  const query = useQuery({ queryKey: ["vendor", vendorId], queryFn: () => getVendor(vendorId) });
  const [opening, setOpening] = useState(false);
  const vendor = query.data;

  if (query.isPending || !vendor) return <div className="h-64 animate-pulse rounded-2xl bg-(--bg-card)" role="status" aria-label="Loading" />;

  const isOwner = vendor.my_role === "Owner";
  const mode = isOwner ? "owner" : "member";

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{vendor.name} <StatusTag status={vendor.status} raw /></span>}
        subtitle={isOwner ? "Your business: papers, where you are paid, your people and your shops." : `You work here as ${vendor.my_role}.`}
        actions={isOwner && vendor.status !== "Suspended" && vendor.status !== "Rejected" ? <Button icon="pi pi-plus" label="Open a shop" onClick={() => setOpening(true)} /> : undefined}
      />
      <StatusBanner vendor={vendor} isOwner={isOwner} />
      <div className="grid gap-5 xl:grid-cols-2">
        <VendorDetailsCard vendor={vendor} editable={isOwner} />
        <ShopsCard vendor={vendor} />
        {isOwner && <VendorDocumentsCard vendor={vendor} mode="owner" />}
        {isOwner && <PayoutDestinationsCard vendor={vendor} mode={mode} />}
        <VendorMembersCard vendor={vendor} mode={mode} />
      </div>
      {isOwner && <NewShopDialog vendor={vendor} visible={opening} onHide={() => setOpening(false)} />}
    </div>
  );
}

/** What the application needs next, said plainly. */
function StatusBanner({ vendor, isOwner }: { vendor: Vendor; isOwner: boolean }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const resubmit = useMutation({
    mutationFn: () => resubmitVendor(vendor.id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      toast.success(response.message);
    },
  });

  const missing = vendor.missing_documents ?? [];
  const tone = {
    Pending: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
    Approved: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    Rejected: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
    Suspended: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
  }[vendor.status];

  const message = {
    Pending: missing.length
      ? `Before we can check your business, add: ${missing.join(", ")}. Then open your first shop and choose where it is paid.`
      : "Your papers are in. We are checking them and will tell you by SMS and email. Meanwhile, set up your shops.",
    Approved: "Your business is verified. Each shop opens once it is reviewed.",
    Rejected: `Your application was not approved: ${vendor.status_reason ?? ""} Correct your details or papers, then send it again.`,
    Suspended: `Your business is suspended and your shops are closed for now: ${vendor.status_reason ?? ""}`,
  }[vendor.status];

  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p className="min-w-0 flex-1">{message}</p>
      {isOwner && vendor.status === "Rejected" && (
        <Button
          size="small"
          label="Send again"
          icon="pi pi-send"
          loading={resubmit.isPending}
          onClick={() => confirmAction({ header: "Send your application again?", message: "Make sure your details and papers are corrected first.", acceptLabel: "Send again", accept: () => resubmit.mutateAsync() })}
        />
      )}
    </div>
  );
}

function ShopsCard({ vendor }: { vendor: Vendor }) {
  const shops = vendor.shops ?? [];
  return (
    <Card title="Shops" actions={<Link href="/dashboard/shops" className="text-sm font-semibold text-(--brand-ink) hover:underline">See all</Link>}>
      {shops.length === 0 ? (
        <EmptyState icon="pi-shop" title="No shop yet" body="Open your first shop: its name, what it sells and where it is." />
      ) : (
        <ul className="divide-y divide-(--border-color)">
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/shops/${s.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2.5 hover:text-(--brand-ink)">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-(--text-muted)">{s.address}</span>
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
