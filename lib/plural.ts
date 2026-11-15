/**
 * A count with its noun, pluralised: "1 category", "3 categories".
 *
 * The count is always known where these strings are built, so nothing here has
 * to hedge with "category(ies)". Irregular plurals are passed in.
 */
export function plural(count: number, singular: string, many?: string): string {
  return `${count} ${count === 1 ? singular : (many ?? `${singular}s`)}`;
}
