"use client";

import React, { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { useResetWhen } from "@/hooks/useResetOnOpen";

interface ListSearchProps {
  /** Currently applied term (from the URL), not the in-progress input. */
  value: string;
  onSearch: (term: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search box that only queries on submit.
 *
 * Deliberately not search-as-you-type: these lists hit paginated endpoints
 * (villages alone is ~71k rows), and firing a request per keystroke costs far
 * more than it saves on a table the user is scanning anyway.
 *
 * Safe to nest inside a form. See the note on the wrapper below.
 */
export default function ListSearch({
  value,
  onSearch,
  placeholder = "Search…",
  className = "w-52",
}: ListSearchProps) {
  const [term, setTerm] = useState(value);

  // Re-sync when the URL changes underneath us (Back button, chip cleared), before the paint.
  useResetWhen(value, () => setTerm(value));

  const submit = () => onSearch(term.trim());

  return (
    /*
     * A DIV, NOT A FORM, and that is not cosmetic.
     *
     * HTML forbids a form inside a form, and this box sits inside one on the
     * sampling pane, where `RowForm` wraps the whole answer. Nested, React
     * reported a hydration error and, worse, Enter in the search box would have
     * submitted the OUTER form and saved the answer.
     *
     * Nothing is lost: a search box needs Enter and a click, and neither wants a
     * form element. `preventDefault` on Enter is what stops the key reaching a
     * form above this one.
     */
    // On a phone the box takes what is left of its line, so the filter button
    // fits beside it; from `sm` up it is the caller's width (`w-60` becomes
    // `sm:w-60`; Tailwind sees those literals here: sm:w-52 sm:w-60 sm:w-72).
    <div className="flex min-w-0 flex-1 items-center sm:flex-none">
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <InputText
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;

            e.preventDefault();
            submit();
          }}
          placeholder={placeholder}
          className={`w-full ${className.replace(/\bw-/g, "sm:w-")} rounded-r-none! border-r-0! pr-7 text-sm`}
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              onSearch("");
            }}
            aria-label="Clear search"
            className="pi pi-times absolute right-2 top-1/2 -translate-y-1/2 text-xs text-(--text-muted) hover:text-(--text-primary)"
          />
        )}
      </div>
      <Button
        type="button"
        onClick={submit}
        icon="pi pi-search"
        severity="secondary"
        outlined
        className="rounded-l-none!"
      />
    </div>
  );
}
