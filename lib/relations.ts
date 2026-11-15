/**
 * Turning a nested relation into what a picker or a scope chip needs.
 *
 * The API nests relations in place, so a product's shop is `row.shop` and
 * needs no resolution. What is left is the part that was never about the wire
 * format: reducing a related record to an id and a label.
 */

/**
 * A related record reduced to what a table cell or a drill-down scope needs.
 * Lives here rather than with a picker because it is the shape a relation
 * collapses to, independent of which widget later displays it.
 */
export interface EntityOption {
  id: string;
  name: string;
}

/**
 * Adapts a nested relation to the `{ value, label }` pair `InfiniteSelect` takes.
 *
 * Accepts the relation as the API sends it, where `name` is optional because a
 * request that did not `include=` it has nothing to show. An unnamed relation
 * still yields its id, so the picker holds the right value while the label
 * degrades rather than the whole option vanishing.
 */
export function toSelectOption(
  related: { id: string; name?: string } | null | undefined,
): { value: string; label: string } | null {
  return related
    ? { value: related.id, label: related.name ?? "Unnamed" }
    : null;
}
