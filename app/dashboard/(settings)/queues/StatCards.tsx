"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FiClock, FiXCircle, FiServer } from "react-icons/fi";
import { getJobStats } from "@/services/settings/jobs/jobs-service";

function StatSkeleton() {
  return (
    <div className="mb-5 grid animate-pulse grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-(--border-color) bg-(--bg-card) p-4"
        >
          <div className="mb-3 h-8 w-8 rounded-full bg-(--border-color)" />
          <div className="mb-2 h-3 w-24 rounded bg-(--border-color)" />
          <div className="h-6 w-12 rounded bg-(--border-color)" />
        </div>
      ))}
    </div>
  );
}

export default function StatCards() {
  const query = useQuery({
    queryKey: ["queues", "job-stats"],
    queryFn: async (ctx) => (await getJobStats(ctx)).data,
    // Queue depth is only meaningful live, a worker drains it continuously.
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  if (query.isPending) return <StatSkeleton />;
  if (query.isError || !query.data) return null;

  const { total_queued, total_failed, by_queue } = query.data;

  const primary = [
    {
      label: "Total queued",
      value: total_queued,
      icon: <FiClock size={22} />,
      color: "text-(--brand-ink)",
      bg: "bg-(--brand-light)",
    },
    {
      label: "Total failed",
      value: total_failed,
      icon: <FiXCircle size={22} />,
      color: "text-(--color-danger)",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
  ];

  return (
    <div className="mb-5 space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {primary.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-xl border border-(--border-color) bg-(--bg-card) p-4 shadow-(--shadow-sm)"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.bg} ${s.color}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-(--text-muted)">
                {s.label}
              </p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {s.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {by_queue?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {by_queue.map((q) => (
            <div
              key={q.queue}
              className="flex items-center gap-3 rounded-xl border border-(--border-color) bg-(--bg-card) p-3 shadow-(--shadow-sm)"
            >
              <FiServer size={16} className="shrink-0 text-(--text-muted)" />
              <div className="min-w-0">
                <p className="truncate text-xs capitalize text-(--text-muted)">
                  {q.queue}
                </p>
                <p className="text-sm font-semibold text-(--text-primary)">{q.total}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
