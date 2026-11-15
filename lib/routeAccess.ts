/**
 * Which dashboard pages each role may reach.
 *
 * The single source of truth for *page* access: `proxy.ts` enforces it on navigation and
 * `AppSidebar` filters the nav with it, so a link is never shown for a page the proxy then
 * refuses. Which RECORD someone may open (a vendor's own orders) is the API's question, through
 * policies; this only decides which screens exist.
 *
 * Role keys are byte-identical to RolesAndPermissionsSeeder: Admin, Staff and Vendor (D26).
 * Each Phase 1 module adds its pages here (shops, products, orders, payouts).
 */

const COMMON = ["/dashboard", "/dashboard/profile", "/dashboard/notifications"];

// The platform's people and its machinery: Admin only.
const ADMINISTRATION = ["/dashboard/users"];
const SETTINGS = ["/dashboard/roles", "/dashboard/queues", "/dashboard/audit-trail"];

/**
 * Whether a path is a dashboard page. Only these need a session: everything else is the
 * storefront (shops, products, cart, checkout, order tracking), open to everyone, because
 * buyers never sign in. proxy.ts and the 401 handler (lib/handleApiError.ts) both ask this.
 */
export function isDashboardRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export const ROLE_ROUTES: Record<string, string[]> = {
  Admin: [...COMMON, ...ADMINISTRATION, ...SETTINGS],
  Staff: [...COMMON],
  Vendor: [...COMMON],
};

/**
 * True when `role` may open `pathname`. Prefix matching on a slash boundary, so
 * `/dashboard/users` grants `/dashboard/users/{id}`. `/dashboard` itself is exact, or it would
 * grant everything beneath it.
 */
const EXACT_ONLY = new Set(["/dashboard"]);
export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  const routes = ROLE_ROUTES[role];
  if (!routes) return false;
  return routes.some((route) => pathname === route || (!EXACT_ONLY.has(route) && pathname.startsWith(`${route}/`)));
}
