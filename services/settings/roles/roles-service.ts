import axiosAPI from "../../axiosApi";
import type { AxiosResponse } from "axios";
import type { QueryFunctionContext } from "@tanstack/react-query";

export interface Permission {
  name: string;
  value: boolean;
}

export interface RoleItem {
  role: string;
  permissions: Permission[];
}

export interface SyncRolePermissionsPayload {
  roles: RoleItem[];
}

/** Roles with a per-permission boolean matrix: drives the permission grid. */
export function getAllRolesWithPermissions(
  ctx?: QueryFunctionContext
): Promise<AxiosResponse<RoleItem[]>> {
  return axiosAPI.get("/v1/roles-permissions/with-permissions", { signal: ctx?.signal });
}

export function syncPermissionsToRoles(
  data: SyncRolePermissionsPayload
): Promise<AxiosResponse<{ message: string }>> {
  return axiosAPI.post("/v1/roles-permissions/sync-permissions", data);
}

/** All roles with their currently attached permission models. */
export function getAllRoles(ctx?: QueryFunctionContext): Promise<AxiosResponse> {
  return axiosAPI.get("/v1/roles-permissions", { signal: ctx?.signal });
}

/** Only the roles the signed-in user is allowed to hand out (user forms). */
export function getAssignableRoles(ctx?: QueryFunctionContext): Promise<AxiosResponse<string[]>> {
  return axiosAPI.get("/v1/roles-permissions/assignable", { signal: ctx?.signal });
}

/**
 * The whole role vocabulary as `{ id, name }`, for pickers that ADDRESS a role.
 *
 * Not `getAssignableRoles`, which answers "may you hand this role out": a picker that
 * addresses people by role needs every role, whoever is asking.
 */
export function getRoleNames(ctx?: QueryFunctionContext): Promise<AxiosResponse<{ data: { id: string; name: string }[] }>> {
  return axiosAPI.get("/v1/roles-permissions/names", { signal: ctx?.signal });
}
