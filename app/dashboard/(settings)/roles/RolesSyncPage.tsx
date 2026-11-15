"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllRolesWithPermissions } from "@/services/settings/roles/roles-service";
import RowForm from "./widgets/RowForm";
import type { Role } from "./widgets/types";

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 rounded-xl border border-(--border-color) bg-(--bg-card) p-5">
      <div className="flex gap-2 border-b border-(--border-color) pb-0">
        {[140, 100, 120, 110, 100].map((w, i) => (
          <div key={i} className="h-10 rounded-t bg-(--border-color)" style={{ width: w }} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, j) => (
          <div key={j} className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded bg-(--border-color)" />
            <div className="h-3 flex-1 rounded bg-(--border-color)" />
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-2">
        <div className="h-9 w-52 rounded-md bg-(--border-color)" />
      </div>
    </div>
  );
}

export default function RolesSyncPage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["roles-with-permissions"],
    // A bare array, not a `{ data }` envelope.
    queryFn: async (ctx): Promise<Role[]> => (await getAllRolesWithPermissions(ctx)).data,
    staleTime: 5 * 60 * 1000,
  });

  if (query.isPending) return <PageSkeleton />;

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) py-20 text-(--text-muted)">
        <span className="pi pi-exclamation-circle text-4xl opacity-40" />
        <p className="text-sm font-medium">Failed to load roles</p>
        <button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] })
          }
          className="text-xs text-(--brand-ink) hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!query.data.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) py-20 text-(--text-muted)">
        <span className="pi pi-inbox text-4xl opacity-40" />
        <p className="text-sm font-medium">No roles found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-(--border-color) bg-(--bg-card) p-4 shadow-(--shadow-sm)">
      <RowForm rolesData={query.data} />
    </div>
  );
}
