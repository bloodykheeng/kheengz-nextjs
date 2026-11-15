"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Permission } from "@/lib/permissions";

/**
 * The signed-in user's permissions, as predicates.
 *
 * Source is `AuthContext`, i.e. `GET auth/profile`, which returns
 * `getAllPermissions()` for the user's role. Never derive this from the role name
 * on the client: the seeder can move a permission between roles without the
 * frontend knowing.
 *
 * This hides controls; it does not secure anything. The API gates the same
 * actions with `can:` middleware (see routes/api.php), and that is the real
 * boundary. This only stops the UI from offering a button that answers 403.
 *
 * Renders before the profile lands would see an empty permission set, so
 * `DashboardLayout` holds the shell on `isProfileLoading` rather than letting the
 * nav paint empty and fill in a moment later.
 */
export function usePermissions() {
  const { permissions, isProfileLoading } = useAuth();

  return useMemo(() => {
    const granted = new Set(permissions);
    const can = (permission: Permission) => granted.has(permission);

    return {
      permissions,
      isLoading: isProfileLoading,
      can,
      canAny: (...list: Permission[]) => list.some(can),
      canAll: (...list: Permission[]) => list.every(can),
    };
  }, [permissions, isProfileLoading]);
}

export default usePermissions;
