import axiosAPI from "../axiosApi";
import { cleanParams } from "../types/api";
import type { Audited, Paginated } from "../types/kheengz";

/** Accounts: Admin, Staff and Vendor (D26). Buyers never have one. */
export type AccountRole = "Admin" | "Staff" | "Vendor";

export interface User extends Audited {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  allow_notifications: boolean;
  status: "Active" | "Inactive";
  /** "No Role" for an account that was never given one. */
  role: AccountRole | "No Role";
  lastlogin: string | null;
  photo_url: string | null;
  /** Upload, Link (our copy of a pasted link) or External. */
  photo_source?: "Upload" | "Link" | "External" | null;
  photo_source_url?: string | null;
  timezone: string | null;
  /** Set when they entered the code from their sign-up email. Separate from `status`, the Admin's on/off switch. */
  email_verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: AccountRole;
  status?: "Active" | "Inactive";
  password?: string | null;
}

type Params = Record<string, string | number | boolean | undefined | null>;

export async function getUsers(params: Params = {}) {
  const { data } = await axiosAPI.get<Paginated<User>>("/v1/users", { params: cleanParams(params) });
  return data;
}

export async function createUser(payload: UserPayload) {
  const { data } = await axiosAPI.post<{ message: string; data: User }>("/v1/users", payload);
  return data;
}

export async function updateUser(id: string, payload: UserPayload) {
  const { data } = await axiosAPI.put<{ message: string; data: User }>(`/v1/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await axiosAPI.delete<{ message: string }>(`/v1/users/${id}`);
  return data;
}

/** Emails a new sign-up code to an account that has not confirmed its email. */
export async function resendVerificationCode(id: string) {
  const { data } = await axiosAPI.post<{ message: string }>(`/v1/users/${id}/verification-code`);
  return data;
}

/** All or none: one account that cannot go refuses the batch. */
export async function deleteUsers(ids: string[]) {
  const { data } = await axiosAPI.delete<{ message: string }>("/v1/users/bulk/delete", { data: { ids } });
  return data;
}
