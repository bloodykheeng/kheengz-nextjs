"use client";

import React from "react";
import { Dropdown } from "primereact/dropdown";
import type { Category } from "@/services/types/catalogue";

/**
 * Choose a category by its path ("Household › Kitchen › Basins"), searchable. The list is the whole
 * tree in tree order, so a parent reads above its children; `disabled` greys out the ones that cannot
 * be chosen (a category's own branch when moving it, a branch already four deep).
 */
export default function CategoryPicker({
  categories,
  value,
  onChange,
  placeholder = "Choose a category",
  invalid,
  disabled,
  showClear,
  id,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: (c: Category) => boolean;
  showClear?: boolean;
  id?: string;
}) {
  const options = categories.map((c) => ({ ...c, disabled: disabled?.(c) ?? false }));

  return (
    <Dropdown
      inputId={id}
      value={value}
      options={options}
      optionValue="id"
      optionLabel="path"
      optionDisabled="disabled"
      onChange={(e) => onChange(e.value ?? null)}
      filter
      filterBy="path"
      filterPlaceholder="Type to search, like basins"
      placeholder={placeholder}
      showClear={showClear}
      invalid={invalid}
      className="w-full"
      emptyFilterMessage="No category matches. Ask for a new one."
      itemTemplate={(c: Category) => (
        <span className="flex items-center gap-2" style={{ paddingLeft: `${(c.depth - 1) * 0.9}rem` }}>
          {c.icon && <span className={`pi ${c.icon} text-xs text-(--text-muted)`} aria-hidden />}
          <span className={c.depth === 1 ? "font-medium" : ""}>{c.name}</span>
          {!c.is_active && <span className="text-xs text-(--text-muted)">(off)</span>}
        </span>
      )}
      valueTemplate={(c: Category | null, props) => (c ? <span>{c.path}</span> : <span>{props.placeholder}</span>)}
    />
  );
}

/** The ids of `category` and everything under it, from the flat tree. */
export function branchOf(categories: Category[], id: string): Set<string> {
  const branch = new Set([id]);
  for (const c of categories) {
    if (c.parent_id && branch.has(c.parent_id)) branch.add(c.id);
  }
  return branch;
}
