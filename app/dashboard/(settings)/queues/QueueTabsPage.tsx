"use client";

import React from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useAppRouter } from "@/hooks/useAppRouter";
import { TabView, TabPanel } from "primereact/tabview";
import StatCards from "./StatCards";
import RecordsList from "./RecordsList";

/**
 * The two tabs share one URL. Switching tabs clears the list params, because a
 * sort valid only for Jobs (e.g. `attempts`) would otherwise leak into Failed
 * Jobs, whose allowedSorts differ, and 400 the request. Only the active tab's
 * list is mounted, so the shared page/search/sort params are never read twice.
 */
const LIST_PARAMS = ["page", "pageSize", "search", "queue", "sort"];

export default function QueueTabsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useAppRouter();

  const activeIndex = searchParams.get("tab") === "failed" ? 1 : 0;

  const onTabChange = (index: number) => {
    const params = new URLSearchParams(searchParams.toString());
    LIST_PARAMS.forEach((k) => params.delete(k));
    if (index === 1) params.set("tab", "failed");
    else params.delete("tab");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <StatCards />

      <div className="overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
        <TabView
          activeIndex={activeIndex}
          onTabChange={(e) => onTabChange(e.index)}
          className="w-full"
        >
          <TabPanel header="Jobs">
            {activeIndex === 0 && <RecordsList queueType="jobs" />}
          </TabPanel>
          <TabPanel header="Failed jobs">
            {activeIndex === 1 && <RecordsList queueType="failed" />}
          </TabPanel>
        </TabView>
      </div>
    </div>
  );
}
