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
    // A vendor's people: their business and the shops they run.
    id: "selling",
    label: "Selling",
    items: [
      { id: "my-business", label: "My business", href: "/dashboard/vendor", iconName: "shop", permission: "run shops" },
      { id: "my-shops", label: "My shops", href: "/dashboard/shops", iconName: "orders", permission: "run shops" },
    ],
  },
  {
    // Reviewers: every vendor and shop (D31, D35).
    id: "marketplace",
    label: "Marketplace",
    items: [
      { id: "vendors", label: "Vendors", href: "/dashboard/vendors", iconName: "people", permission: "view vendors" },
      { id: "shops", label: "Shops", href: "/dashboard/shops", iconName: "shop", permission: "view vendors" },
    ],
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
          { id: "platform-settings", label: "Platform settings", href: "/dashboard/platform-settings", iconName: "wallet", permission: "manage settings" },
        ],
      },
    ],
  },
];
