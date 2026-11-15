import type { NavGroup } from "@/types/navigation";

/**
 * Sidebar navigation. Every `href` must exist in `lib/routeAccess.ts` under each role allowed
 * to reach it; `permission` is the second gate, applied in AppSidebar. Each Phase 1 module adds
 * its entries (shops, products, orders, payouts) to the groups below.
 */
export const menuGroups: NavGroup[] = [
  {
    id: "main",
    items: [{ id: "dashboard", label: "Dashboard", href: "/dashboard", iconName: "dashboard", exact: true }],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { id: "users", label: "Users", href: "/dashboard/users", iconName: "people", permission: "view users" },
      {
        id: "settings",
        label: "Settings",
        iconName: "settings",
        children: [
          { id: "roles", label: "Roles & permissions", href: "/dashboard/roles", iconName: "shield", permission: "manage roles" },
          { id: "queues", label: "Queues", href: "/dashboard/queues", iconName: "queue", permission: "view queue" },
          { id: "audit-trail", label: "Audit trail", href: "/dashboard/audit-trail", iconName: "history", permission: "view activity logs" },
        ],
      },
    ],
  },
];
