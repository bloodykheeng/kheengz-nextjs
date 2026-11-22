/**
 * Permission names, byte-identical to RolesAndPermissionsSeeder on the API.
 *
 * The union makes a typo a compile error rather than a silently hidden button. Add a name only
 * after adding it to the seeder AND putting a matching `can:` on the route. The foundation's
 * are Admin's; each Phase 1 module brings its own (and the first ones for Staff and Vendor).
 */
export const PERMISSIONS = [
  "view users",
  "manage users",
  "manage roles",
  "view activity logs",
  "view queue",
  "manage queue",
  "manage settings",
  "view vendors",
  "manage vendors",
  "run shops",
  "manage catalogue",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
