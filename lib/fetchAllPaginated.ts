/**
 * Walk a paginated endpoint page by page and accumulate the whole set.
 *
 * ## Why an export must not ask for everything at once
 *
 * The alternative is a request with no page size, which makes the server hold
 * the entire result in memory to build one response. A district's compliance
 * report is 703 rows today and the national rollup is 176 times that, and the
 * machine that falls over is production rather than a laptop. The server only
 * ever holds one page; the browser accumulates them.
 *
 * Borrowed from the Nice reports, where the same rule is stated as: always
 * paginate, never `paginate: false` for an export.
 *
 * `onProgress` is what lets an export say how far along it is, which matters
 * here because the page size is deliberately large and the wait is real.
 */
export async function fetchAllPaginated<TRow = unknown>(
  fetchPage: (page: number, perPage: number) => Promise<unknown>,
  extract: (response: unknown) => { rows: TRow[]; lastPage: number },
  opts: {
    perPage?: number;
    /** A guard against a runaway loop, never a limit anybody should hit. */
    maxPages?: number;
    onProgress?: (page: number, lastPage: number) => void;
  } = {},
): Promise<TRow[]> {
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? 500;

  const accumulated: TRow[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await fetchPage(page, perPage);
    const extracted = extract(response);

    lastPage = extracted.lastPage > 0 ? extracted.lastPage : 1;

    if (Array.isArray(extracted.rows)) accumulated.push(...extracted.rows);

    opts.onProgress?.(page, lastPage);
    page++;
  } while (page <= lastPage && page <= maxPages);

  return accumulated;
}
