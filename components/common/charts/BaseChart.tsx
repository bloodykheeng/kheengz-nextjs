"use client";

import dynamic from "next/dynamic";
import type { BaseChartProps } from "./BaseChartClient";

/**
 * The client-only boundary every chart in this app renders through.
 *
 * Highcharts and its feature modules touch browser globals and Highcharts
 * internals at module evaluation time, which throws under server rendering
 * ("Cannot read properties of undefined (reading 'AST')"). Loading the real
 * implementation through `dynamic(ssr: false)` keeps all of it off the server.
 *
 * Doing it here rather than per chart is the point: one boundary covers every
 * chart, so a new chart cannot forget it and break the build. Same reasoning as
 * `react-leaflet`, which is `ssr: false` for the same class of reason.
 */
const BaseChartClient = dynamic(() => import("./BaseChartClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-50 items-center justify-center text-xs text-(--text-muted)">
      <span className="pi pi-spin pi-spinner mr-2" /> Loading chart…
    </div>
  ),
});

export default function BaseChart(props: BaseChartProps) {
  return <BaseChartClient {...props} />;
}
