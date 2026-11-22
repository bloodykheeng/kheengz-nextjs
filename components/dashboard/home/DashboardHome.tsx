"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessRoute } from "@/lib/routeAccess";
import type { Permission } from "@/lib/permissions";
import { Card, EmptyState, PageHeader } from "@/components/dashboard/ui";
import { useTimeGreeting } from "@/hooks/useTimeGreeting";

interface Shortcut {
  href: string;
  label: string;
  body: string;
  icon: string;
  permission: Permission;
}

// Only pages that exist: each Phase 1 module adds its own (orders, products, payouts) and the
// figures for this page (sales today, orders waiting, money paid out).
const SHORTCUTS: Shortcut[] = [
  { href: "/dashboard/vendor", label: "My business", body: "Your papers, where you are paid, your people.", icon: "pi-briefcase", permission: "run shops" },
  { href: "/dashboard/shops", label: "My shops", body: "Open shops and send each for review.", icon: "pi-shop", permission: "run shops" },
  { href: "/dashboard/vendors", label: "Vendors", body: "Check applications and papers, approve or suspend.", icon: "pi-id-card", permission: "view vendors" },
  { href: "/dashboard/shops", label: "Shops", body: "Review shops waiting to open.", icon: "pi-shop", permission: "view vendors" },
  { href: "/dashboard/catalogue/categories", label: "Categories", body: "The marketplace's tree and what buyers filter by.", icon: "pi-sitemap", permission: "manage catalogue" },
  { href: "/dashboard/catalogue/requests", label: "Category requests", body: "Shops asking for a category the tree lacks.", icon: "pi-inbox", permission: "manage catalogue" },
  { href: "/dashboard/users", label: "Users", body: "Add Admins, Staff and vendors, and turn accounts on or off.", icon: "pi-users", permission: "view users" },
  { href: "/dashboard/roles", label: "Roles & permissions", body: "Choose what each role may see and do.", icon: "pi-shield", permission: "manage roles" },
  { href: "/dashboard/queues", label: "Queues", body: "Emails, SMS and other work waiting or failed.", icon: "pi-list", permission: "view queue" },
  { href: "/dashboard/audit-trail", label: "Audit trail", body: "Who changed what, when, and from where.", icon: "pi-history", permission: "view activity logs" },
  { href: "/dashboard/platform-settings", label: "Platform settings", body: "Commission, fees, debt limits, ways to pay.", icon: "pi-sliders-h", permission: "manage settings" },
];

/** Greets the person, links to what their role can open, and holds the place for the shop's figures. */
export default function DashboardHome() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const greeting = useTimeGreeting();
  // One card per page: a reviewer who also runs shops sees "Shops" once.
  const shortcuts = SHORTCUTS.filter((s) => can(s.permission) && canAccessRoute(user?.role, s.href))
    .filter((s, i, all) => all.findIndex((o) => o.href === s.href) === i);

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting}, ${user?.name?.split(" ")[0] ?? "there"}`} subtitle="Everything you look after, in one place." />

      {shortcuts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex min-h-11 flex-col gap-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm) transition-colors hover:border-(--brand-mid)"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--brand-light) text-(--brand-ink)">
                <span className={`pi ${s.icon}`} aria-hidden />
              </span>
              <span className="font-semibold text-(--text-primary) group-hover:text-(--brand-ink)">{s.label}</span>
              <span className="text-sm text-(--text-muted)">{s.body}</span>
            </Link>
          ))}
        </div>
      )}

      <Card title="Sales">
        <EmptyState icon="pi-shopping-bag" title="No sales yet" body="Orders, money received and payouts will show here as they come in." />
      </Card>
    </div>
  );
}
