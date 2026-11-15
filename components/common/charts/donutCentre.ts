import type Highcharts from "highcharts";

/**
 * The label in a donut's hole, placed on the ring's actual centre.
 *
 * A chart title cannot do it: the ring is centred on the plot area and moved to
 * make room for data labels and a legend, while the title is centred on the
 * chart's spacing box, which knows none of that. Any correction from the
 * title's side is a guess at a gap that depends on the data.
 *
 * So on every render this asks the series where its centre is (`series.center`,
 * computed after the labels are laid out), draws the lines into a group,
 * measures with `getBBox` and translates the group onto that point. The old
 * group is destroyed first, `render` firing on every reflow.
 *
 * Drawn with the renderer rather than as an HTML overlay, so it survives into an
 * exported PNG. Sized to the hole as well: a fixed 26px fits "688" and not
 * "14,868", so the text is measured against `series.center[3]` and shrunk once
 * by the ratio it overflowed by.
 */
/** Comfortable for a three digit total, which is the ordinary case. */
const BASE_FONT_SIZE = 26;

/** Below this the total is not worth reading, so a huge one just gets small. */
const MIN_FONT_SIZE = 13;

export function donutCentreLabel(options: {
  /** The big line: the total the ring adds up to. */
  value: string;
  /** The small line under it: what that total counts. */
  caption: string;
  valueColor: string;
  captionColor: string;
}) {
  return function render(this: Highcharts.Chart) {
    // Highcharts has no typed slot for a caller's own element, so the group is
    // parked on the chart under a name nothing else uses.
    const chart = this as Highcharts.Chart & {
      donutCentreGroup?: Highcharts.SVGElement;
    };

    const series = chart.series?.[0] as
      (Highcharts.Series & { center?: number[] }) | undefined;

    if (!series?.center) return;

    chart.donutCentreGroup?.destroy();

    const [centreX, centreY, , innerDiameter] = series.center;
    const x = chart.plotLeft + centreX;
    const y = chart.plotTop + centreY;

    const group = chart.renderer.g("donut-centre").add();

    const value = chart.renderer
      .text(options.value, 0, 0)
      .attr({ "text-anchor": "middle" })
      .css({
        fontSize: `${BASE_FONT_SIZE}px`,
        fontWeight: "700",
        color: options.valueColor,
        fill: options.valueColor,
      })
      .add(group);

    /*
     * Fit it to the hole, measured rather than counted.
     *
     * `center[3]` is the inner diameter in pixels, which is the widest the text
     * can be, less a margin so the glyphs do not touch the ring. Only ever
     * shrinks: a short total should not swell to fill a large donut.
     */
    const room = innerDiameter * 0.82;
    const painted = value.getBBox().width;

    if (painted > room && painted > 0) {
      value.css({
        fontSize: `${Math.max(
          MIN_FONT_SIZE,
          Math.floor((BASE_FONT_SIZE * room) / painted),
        )}px`,
      });
    }

    chart.renderer
      // 18 below the first line's baseline: this positions the SECOND line
      // relative to the first, which is a real relationship. Where the pair
      // ends up is settled by the measurement below, not by this number.
      .text(options.caption, 0, 18)
      .attr({ "text-anchor": "middle" })
      .css({
        fontSize: "11px",
        color: options.captionColor,
        fill: options.captionColor,
      })
      .add(group);

    // Measure what was painted, then move it. `getBBox` is the real box of the
    // real glyphs, so this is exact for any font, any size and any string.
    const box = group.getBBox();

    group.translate(x - (box.x + box.width / 2), y - (box.y + box.height / 2));

    chart.donutCentreGroup = group;
  };
}
