import React from "react";

/**
 * A heading and a rule over a group of filters, in the funnel dialogs.
 *
 * Small, muted and upper case, so it reads as a divider rather than as another
 * field label competing with the ones under it. A heading and a rule, never a
 * filled box: the fields inside are the same kind of thing as the fields above,
 * so a panel would imply a nesting that is not there.
 *
 * **The section is never named after a field inside it.** `Score` under a
 * heading reading Score says the same word twice and divides nothing. Name what
 * the group is ABOUT: `Figures` holds Score and Based on, `Display` holds Order
 * by and Rows, `Delivery` holds the area and the rider.
 *
 * Shared because the map wrote this first and every other funnel copied it, and
 * two copies of a divider is how three dialogs come to look like three products.
 */
export default function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="border-b border-(--border-color) pb-2 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
        {title}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
