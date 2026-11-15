import axiosAPI from "../../axiosApi";
import { cleanParams } from "../../types/api";
import type { AxiosResponse } from "axios";
import type { QueryFunctionContext } from "@tanstack/react-query";
import type { Paginated } from "../../types/kheengz";

/** A waiting job (App\Http\Resources\JobResource). Times are unix seconds, as the framework's jobs table keeps them. */
export interface QueuedJob {
  id: number;
  queue: string;
  payload: string;
  attempts: number;
  reserved_at: number | null;
  available_at: number;
  created_at: number;
}

/** A job that failed (App\Http\Resources\FailedJobResource). */
export interface FailedJob {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failed_at: string;
}

/** One row of either tab: the Queues screen shares one table between them. */
export type QueueRecord = { id: number } & Partial<Omit<QueuedJob, "id"> & Omit<FailedJob, "id">>;

export interface JobListParams {
  page?: number;
  per_page?: number;
  "filter[queue]"?: string;
  "filter[search]"?: string;
  sort?: string;
  all?: boolean;
}

export interface JobStats {
  total_queued: number;
  total_failed: number;
  by_queue: { queue: string; total: number }[];
}

export function getAllJobs(
  params: JobListParams = {},
  ctx?: QueryFunctionContext
): Promise<AxiosResponse<Paginated<QueuedJob>>> {
  return axiosAPI.get("/v1/jobs", { signal: ctx?.signal, params: cleanParams(params) });
}

export function getAllFailedJobs(
  params: JobListParams = {},
  ctx?: QueryFunctionContext
): Promise<AxiosResponse<Paginated<FailedJob>>> {
  return axiosAPI.get("/v1/jobs/failed", {
    signal: ctx?.signal,
    params: cleanParams(params),
  });
}

export function getJobStats(ctx?: QueryFunctionContext): Promise<AxiosResponse<JobStats>> {
  return axiosAPI.get("/v1/jobs/stats", { signal: ctx?.signal });
}

// The queue tables are framework-owned and keep auto-incrementing ids, so these
// two stay numeric while every other bulk-delete in the app posts ULID strings.
export function bulkDestroyJobs(ids: (number | string)[]): Promise<AxiosResponse> {
  return axiosAPI.delete("/v1/jobs/bulk/delete", { data: { ids: ids.map(Number) } });
}

export function bulkDestroyFailedJobs(ids: (number | string)[]): Promise<AxiosResponse> {
  return axiosAPI.delete("/v1/jobs/failed/bulk/delete", {
    data: { ids: ids.map(Number) },
  });
}
