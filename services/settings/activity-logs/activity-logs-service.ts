import type { RelatedRecord } from "@/services/types/api";
import axiosAPI from "../../axiosApi";
import { cleanParams } from "../../types/api";
import type { AxiosResponse } from "axios";
import type { QueryFunctionContext } from "@tanstack/react-query";

export interface ActivityLogListParams {
  page?: number;
  per_page?: number;
  "filter[search]"?: string;
  "filter[log_name]"?: string;
  "filter[event]"?: string;
  "filter[causer_id]"?: string;
  "filter[subject_type]"?: string;
  "filter[subject_id]"?: string;
  "filter[outcome]"?: string;
  "filter[start_date]"?: string;
  "filter[end_date]"?: string;
  sort?: string;
  include?: string;
  all?: boolean;
}

/** One field's before/after pair, as written by `buildChanges()` on the backend. */
export interface FieldChange {
  old: unknown;
  new: unknown;
}

export interface ActivityLogFields {
  /** The module the entry belongs to, e.g. `User`. */
  log_name: string | null;
  description: string;
  event: string | null;
  subject_type: string | null;
  subject_id: string | null;
  causer_type: string | null;
  causer_id: string | null;
  properties: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;

  // Nested by `include=`, absent otherwise.
  causer?: RelatedRecord | null;
}

export function getAllActivityLogs(
  params: ActivityLogListParams = {},
  ctx?: QueryFunctionContext
): Promise<AxiosResponse> {
  return axiosAPI.get("/v1/activity-logs", {
    signal: ctx?.signal,
    params: cleanParams(params),
  });
}

export function bulkDestroyActivityLogs(ids: string[]): Promise<AxiosResponse> {
  return axiosAPI.delete("/v1/activity-logs/bulk/delete", { data: { ids } });
}
