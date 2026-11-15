"use client";

import React from "react";

export interface ChipOption {
  label: string;
  value: string;
}

interface ChipMultiSelectProps {
  /** The ticked values. Order follows `options`, not the order they were clicked. */
  value: string[];
  options: ChipOption[];
  onChange: (value: string[]) => void;
  /** Names the group for assistive tech, e.g. "Response level". */
  label: string;
  /**
   * How few may stay ticked. One everywhere it is used today.
   *
   * The last ticked chip refuses to come off, so a reader cannot land on a
   * selection that shows nothing by clicking the chip they already had. What
   * ticking both does is explained in the overlay beside the label rather than
   * in a line under the chips, which would sit there permanently.
   */
  minSelected?: number;
}

/**
 * A chip group where several may be ticked at once.
 *
 * Beside `ChipSelect`, not replacing it: a group with one answer and a group
 * with several read the same and behave differently, and the difference is
 * whether ticking a second one replaces the first. Kept apart so neither has a
 * mode flag deciding which it is.
 */
export default function ChipMultiSelect({
  value,
  options,
  onChange,
  label,
  minSelected = 0,
}: ChipMultiSelectProps) {
  const order = options.map((option) => option.value);

  const toggle = (option: string) => {
    const ticked = value.includes(option);

    if (ticked && value.length <= minSelected) return;

    const next = ticked
      ? value.filter((entry) => entry !== option)
      : [...value, option];

    onChange(order.filter((entry) => next.includes(entry)));
  };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value);
        // The last one standing: still ticked, and a click on it does
        // nothing rather than emptying the selection.
        const held = selected && value.length <= minSelected;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? "border-transparent bg-(--brand) text-white"
                : "border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-page)"
            } ${held ? "cursor-default" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
