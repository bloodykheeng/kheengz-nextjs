"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
// Feature modules, imported for their side effects: they register themselves on
// the global Highcharts object. Exporting gives every chart a PNG/SVG/CSV/XLS
// menu for free, which is what "export" on the dashboard means, so no chart
// needs a download button of its own. These touch Highcharts internals at
// evaluation time, which is why this whole file is client-only (see BaseChart).
import "highcharts/modules/exporting";
import "highcharts/modules/export-data";
import "highcharts/modules/full-screen";
import "highcharts/modules/no-data-to-display";
import "highcharts/modules/accessibility";

import { useTheme } from "@/contexts/ThemeContext";

/**
 * Theme-aware Highcharts wrapper.
 *
 * Presentational only. A caller passes the part that differs (series, axes, a
 * tooltip formatter) and this merges in everything that must NOT differ: the
 * palette, the transparent background, the dark-mode text and grid colours, the
 * export menu and the empty state. A chart that sets its own grid colour is a
 * chart that will be unreadable in one of the two themes.
 */

/**
 * The categorical palette.
 *
 * The platform's royal green leads, then its gold (workspace D8), and the rest
 * are spaced far enough apart in hue AND lightness to survive both a projector
 * and the most common colour blindness. Score-carrying charts do NOT use this:
 * they use SCORE_COLOURS, because there green has to mean Achieved.
 */
const PALETTE = [
  "#0e5e45",
  "#d9a21b",
  "#3fa57f",
  "#c2410c",
  "#5a6acf",
  "#0e8a9e",
  "#b5651d",
  "#64748b",
];

export interface BaseChartProps {
  options: Highcharts.Options;
  /** Pixel height of the plot area. */
  height?: number;
  className?: string;
  /**
   * What this chart is, printed ONLY on the exported image.
   *
   * On screen the card's own heading says it, so a Highcharts title would be
   * the same words twice.
   */
  exportTitle?: string;
  /**
   * What was applied when the export was taken, printed under that title.
   *
   * This is the point of the pair. A chart exported off this dashboard is
   * pasted into reports and WhatsApp groups, and a PNG of one shop's sales is
   * indistinguishable from the whole marketplace's once it leaves the page that
   * said which it was. The filter sentence travels with the image.
   */
  exportSubtitle?: string;
  /**
   * Rebuild the chart from scratch instead of updating it in place.
   *
   * For the heatmap, which Highcharts updates incorrectly: issue #10901 has
   * `series.update({ data })` merging the new points into the old ones and
   * losing a row, and it happens even when the data is identical, which a
   * refetch produces. The caller keys the chart on its data, so a real change
   * remounts and an identical refetch is a no-op rather than a corruption.
   *
   * Everything else updates, which is cheaper and keeps the animation.
   */
  recreateOnChange?: boolean;
  /**
   * The least room the plot needs, for a chart that grows sideways.
   *
   * A FLOOR, never a fixed size. It is applied as `min-width` on the div
   * Highcharts measures, so a chart with room to spare fills its card and one
   * that needs more makes the card scroll. Setting it as `chart.width` instead
   * draws a two row column chart 208px wide in a card 1,500px across.
   *
   * NOT `chart.scrollablePlotArea`, which Highcharts implements by splitting the
   * chart into TWO svg elements, a fixed one carrying the axis and legend and a
   * scrolling one carrying the series. Anything reading the rendered svg then
   * gets half a chart. One svg, one scrolling parent. See charts.md section 17.
   */
  minWidth?: number;
}

export default function BaseChartClient({
  options,
  height = 300,
  className,
  exportTitle,
  exportSubtitle,
  recreateOnChange = false,
  minWidth,
}: BaseChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const boxRef = useRef<HTMLDivElement | null>(null);

  /*
   * WHETHER THIS CHART IS THE ONE FILLING THE SCREEN.
   *
   * Every chart here is given an explicit height, worked out from how many rows
   * it draws, and Highcharts honours that option in full screen too: a six row
   * box plot filled 344px of a 1080px display and the rest was black.
   *
   * Held in React state rather than fixed from Highcharts' own
   * `fullscreenOpen`. That event fires BEFORE the module saves the size it will
   * restore on the way out, so clearing the height there was saved as the
   * original and the chart never got it back. And any re-render has
   * `HighchartsReact` call `chart.update()` with these options again, which put
   * the height back a few seconds after opening. State survives both.
   */
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const open = document.fullscreenElement;

      setFullScreen(Boolean(open && boxRef.current?.contains(open)));
    };

    document.addEventListener("fullscreenchange", onChange);

    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const text = isDark ? "#cbd5e1" : "#475569";
  const muted = isDark ? "#64748b" : "#94a3b8";
  const grid = isDark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.12)";

  const merged = useMemo<Highcharts.Options>(() => {
    const base: Highcharts.Options = {
      chart: {
        backgroundColor: "transparent",
        // Null hands sizing back to the container, which full screen has just
        // made the size of the display.
        height: fullScreen ? null : height,
        // Inherited, so the charts use the same face as the rest of the page
        // rather than Highcharts' own default sans.
        style: { fontFamily: "inherit" },
        spacing: [12, 8, 8, 8],
      },
      colors: PALETTE,
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        itemStyle: { color: text, fontWeight: "500" },
        itemHoverStyle: { color: isDark ? "#ffffff" : "#0f172a" },
      },
      xAxis: {
        labels: { style: { color: muted, fontSize: "11px" } },
        lineColor: grid,
        tickColor: grid,
        gridLineColor: grid,
      },
      yAxis: {
        labels: { style: { color: muted, fontSize: "11px" } },
        gridLineColor: grid,
        title: { style: { color: muted } },
      },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: grid,
        style: { color: text },
        shadow: false,
        /*
         * KEPT INSIDE THE PLOT, rather than allowed out of it.
         *
         * The tooltip was cut off on the leftmost group. `outside: true` is the
         * documented way to escape the chart's own SVG box, and it is not
         * enough here: the tooltip still has to live inside SOME container, and
         * this app's scroll region starts where the sidebar ends, so it was
         * clipped there instead. Highcharts itself already turns `outside` on
         * when a scrollable plot area is set, so it was never the lever.
         *
         * Pinning it right is no better: that cuts off the LAST group instead
         * of the first, which is the same bug at the other end.
         *
         * So it is clamped to the plot. It can never leave, so nothing can clip
         * it, whatever the page around it does. The cost is that on an edge
         * column the tooltip sits over the plot rather than beside it, which is
         * what every charting library does at a boundary.
         */
        outside: false,
        positioner(labelWidth, labelHeight, point) {
          const chart = (this as unknown as { chart: Highcharts.Chart }).chart;

          const gap = 16;
          const left = chart.plotLeft;
          const right = chart.plotLeft + chart.plotWidth;
          const top = chart.plotTop;
          const bottom = chart.plotTop + chart.plotHeight;

          const at = point.plotX + chart.plotLeft;

          /*
           * BESIDE THE POINT, on whichever side has room.
           *
           * Centring it on the point and clamping kept it out of trouble and
           * put it straight over the columns being read: a reader is told the
           * figures and loses the picture. Offering the right first and falling
           * back to the left means the hovered group is never the one covered,
           * at either end of the chart.
           */
          const beside = at + gap;
          const before = at - labelWidth - gap;

          const x =
            beside + labelWidth <= right
              ? beside
              : before >= left
                ? before
                : Math.min(
                    Math.max(left, at - labelWidth / 2),
                    right - labelWidth,
                  );

          // Level with the point where it fits, and inside the plot regardless.
          const y = Math.min(
            Math.max(top, point.plotY + chart.plotTop - labelHeight / 2),
            Math.max(top, bottom - labelHeight),
          );

          return { x, y };
        },
      },
      plotOptions: {
        series: { animation: { duration: 350 } },
        // Pie labels default to black, which is invisible on a dark card.
        pie: { dataLabels: { connectorColor: muted, style: { color: text } } },
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            symbolStroke: muted,
            theme: { fill: "transparent" },
          },
        },
        /*
         * Merged into the export only, which is what `chartOptions` is for.
         *
         * The alternative is what the Nice sell-in charts do, putting the
         * filter sentence into the on-screen title with a <br/>. That works and
         * it costs a heading two or three lines tall on every card, on a page
         * whose cards already carry an HTML heading of their own. Here the words
         * appear when the image leaves the page and nowhere else.
         *
         * The background is set because the on-screen chart is transparent to sit
         * on the card, and an exported PNG with a transparent ground is unreadable
         * the moment it lands on a dark slide.
         */
        chartOptions: {
          chart: { backgroundColor: "#ffffff" },
          title: exportTitle
            ? {
                text: exportTitle,
                style: { color: "#0f172a", fontSize: "15px" },
              }
            : undefined,
          subtitle: exportSubtitle
            ? {
                text: exportSubtitle,
                style: { color: "#475569", fontSize: "11px" },
              }
            : undefined,
        },
      },
      navigation: {
        menuStyle: {
          background: isDark ? "#1e293b" : "#ffffff",
          border: `1px solid ${grid}`,
        },
        menuItemStyle: { color: text },
      },
      lang: { noData: "Nothing to show for this selection." },
      noData: { style: { color: muted, fontSize: "13px", fontWeight: "500" } },
      accessibility: { enabled: true },
    };

    // Highcharts' own merge, which understands its nested option trees. A
    // spread would replace `xAxis` wholesale and lose the theming above.
    return Highcharts.merge(base, options);
  }, [
    options,
    height,
    fullScreen,
    isDark,
    text,
    muted,
    grid,
    exportTitle,
    exportSubtitle,
  ]);

  return (
    // `min-w-0 w-full`, and both halves matter. `w-full` stops Highcharts
    // falling back to its own 600px default when it measures a container that
    // has not been given a width; `min-w-0` stops this div refusing to shrink
    // inside a grid or flex parent, which is what let a chart push the whole
    // page sideways and grow a second scrollbar. See ChartCard.
    <div
      ref={boxRef}
      className={`w-full min-w-0 ${minWidth && !fullScreen ? "overflow-x-auto" : ""} ${className ?? ""}`}
    >
      <HighchartsReact
        highcharts={Highcharts}
        options={merged}
        // Off for a heatmap: see `recreateOnChange`. The chart is then only ever
        // built on mount, and the caller's key decides when that happens.
        allowChartUpdate={!recreateOnChange}
        /*
         * `oneToOne`, which is the third argument and is off by default.
         *
         * Without it `chart.update()` MERGES the new options into the old
         * chart: a series or an axis that is no longer in the options is left
         * behind, and points that no longer exist are not removed. That is what
         * made the comparison heatmap lose its first row after paging away and
         * back, and it is the same fault behind the dashboard's stacked bar
         * losing its category labels, which was worked around there rather than
         * fixed here.
         *
         * With it, the series and axes are matched to the options exactly, so
         * every chart in the portal redraws from what it was actually given.
         *
         * The array is [redraw, oneToOne, animation].
         */
        updateArgs={[true, true, true]}
        /*
         * The div Highcharts measures, and it is the only thing that decides
         * the plot's width.
         *
         * 100% because Highcharts only reflows on a window resize: the sidebar
         * collapsing is not one, so without it a chart keeps the width it was
         * born with while its column changes underneath it.
         *
         * `minWidth` on top of that, so a chart with room to spare fills the
         * card and one needing more makes the card scroll. Both halves matter:
         * without the floor the columns are crushed, and with the floor written
         * as a fixed width instead, two rows draw a 208px chart in a 1,500px
         * card.
         */
        containerProps={{
          style: {
            width: "100%",
            // The floor is dropped in full screen: it is there to make a card
            // scroll, and there is no card.
            ...(minWidth && !fullScreen ? { minWidth: `${minWidth}px` } : {}),
          },
        }}
      />
    </div>
  );
}
