"use client";

import React from "react";

export interface ChipOption {
  label: string;
  value: string;
}

interface ChipSelectProps {
  /** The selected value. `""` means nothing is selected, which reads as "all". */
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
  /** Names the group for assistive tech, e.g. "Status". */
  label: string;
  /**
   * Whether clicking the selected chip deselects it. True everywhere but one.
   *
   * A group whose neutral state has a NAME turns it off: the scope chips are
   * `Assigned`, `Answered` and `Sampled`, and `Assigned` is what the figures
   * cover when nothing else is chosen. Letting it be cleared would leave every
   * chip unlit over a figure that is still assigned-scoped, which is the one
   * thing a reader must not have to guess at.
   */
  clearable?: boolean;
}

/**
 * A single-select chip group where deselecting is the neutral state.
 *
 * Replaces the segmented SelectButton in filter dialogs, for two reasons.
 *
 * The design one: a segmented control needs an explicit "All" segment to say
 * "no filter", which is a control standing for the absence of a control. An
 * unselected chip already says it, so the option disappears and the row reads as
 * what it is, a list of things you may narrow to.
 *
 * The bug one: PrimeReact 10.9.7's Dropdown returns the whole option object
 * rather than its value when that value is the empty string, because
 * `getOptionValue` ends in `props.optionValue || isNotEmpty(optionValue) ?
 * optionValue : option` and `isNotEmpty("")` is false. Any `{ label: "All",
 * value: "" }` option therefore puts `[object Object]` in the URL and matches
 * nothing. Removing the option removes the trap.
 *
 * Clicking the selected chip clears it, so the neutral state stays reachable
 * without a chip that stands for having no chip.
 */
export default function ChipSelect({
  value,
  options,
  onChange,
  label,
  clearable = true,
}: ChipSelectProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected && clearable ? "" : option.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? "border-transparent bg-(--brand) text-white"
                : "border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-page)"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
