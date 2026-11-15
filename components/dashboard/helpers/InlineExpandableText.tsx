"use client";

import React, {
  useState,
  useRef,
  useLayoutEffect,
  type MouseEvent,
} from "react";

interface InlineExpandableTextProps {
  text?: string | null;
  /**
   * How many lines to show while collapsed. Replaces the old character budget: a fixed
   * character count cuts at a different visual width in every column, and mid-word.
   */
  lines?: number;
  /** Accepted so existing call sites keep working; the clamp is by line, not character. */
  maxLength?: number;
  className?: string;
}

/**
 * Long cell text, clamped to a couple of lines and expandable in place.
 *
 * Clamping is CSS (`-webkit-line-clamp`), not string surgery, so text is cut at the real
 * rendered width and always on a whole word, and the full string stays in the DOM for
 * find-in-page and copy. The previous version sliced at a character count and appended a
 * small blue "more", which cut mid-word and put a second clickable thing in every row.
 *
 * The toggle renders only when the text actually overflows, measured after layout: a
 * "show more" on a cell that already fits is noise.
 */
export default function InlineExpandableText({
  text,
  lines = 2,
  className,
}: InlineExpandableTextProps) {
  const str = text ?? "";
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Measured, not guessed, and before paint so the toggle never flashes in and out.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();

    // Re-measure when the column is resized.
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [str, lines]);

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        ref={ref}
        className={className}
        style={
          expanded
            ? { whiteSpace: "pre-wrap" }
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                whiteSpace: "pre-wrap",
              }
        }
        // The full text stays available on hover while collapsed.
        title={!expanded && overflows ? str : undefined}
      >
        {str}
      </span>

      {(overflows || expanded) && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 text-xs font-medium text-(--brand-mid) hover:underline"
        >
          <i
            className={`pi ${expanded ? "pi-chevron-up" : "pi-chevron-down"} text-[9px]`}
          />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
