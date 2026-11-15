import type { Permission } from "@/lib/permissions";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  iconName?: string;
  badge?: string | number;
  badgeVariant?: "default" | "danger" | "warning" | "success";
  children?: NavItem[];
  /**
   * Match this entry's `href` exactly instead of by prefix. Needed by any item
   * whose href is a prefix of its siblings': `/dashboard` would otherwise light
   * up on `/dashboard/users` and every other page, because the default
   * check is `pathname.startsWith(href + "/")`.
   */
  exact?: boolean;
  /**
   * Read permission required to see this entry, on top of the role's route access.
   * Omit when the page has no read gate on the API. Parent items with `children` inherit visibility from them.
   */
  permission?: Permission;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}
