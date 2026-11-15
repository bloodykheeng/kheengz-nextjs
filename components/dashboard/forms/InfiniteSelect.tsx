"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import PrimeReact from "primereact/api";
import { useOverlayListener } from "primereact/hooks";
import { DomHandler, ZIndexUtils } from "primereact/utils";
import type { AxiosResponse } from "axios";

/** `useLayoutEffect` on the client, `useEffect` on the server, to keep SSR quiet. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface Option {
  label: string;
  value: string;
  /**
   * A short state beside the label, e.g. `Sampled`.
   *
   * For a row that is in the list on purpose but is not an ordinary choice.
   * Hiding it would be worse: an officer looking for a school they have already
   * been to would find nothing and conclude the registry is missing it.
   */
  note?: string;
  /** Shown, marked and not choosable. Pair it with `note` so the reason is on the row. */
  disabled?: boolean;
  /**
   * The API row the option came from, when a form needs more than the label once it is
   * chosen (an event's Available Event Balance, an account's user id). Read it off the
   * chosen option; never keep a side map of rows.
   */
  data?: unknown;
}

/** One page as a Laravel paginated collection returns it. */
export interface OptionPage {
  data: unknown[];
  meta: { current_page: number; last_page: number; total: number };
}

interface InfiniteSelectBaseProps {
  /** Stable key parts (resource name, active filters). The search term is appended internally. */
  queryKey: (string | number | null)[];
  /** Fetches one page. Reads `data.data` plus `data.meta.{current_page,last_page,total}`. */
  queryFn: (params: { page: number; search: string }) => Promise<AxiosResponse<OptionPage>>;
  /**
   * Maps one API row to an option. The caller types it for its own rows (`(u: UserRow) => ...`);
   * the rows arrive as JSON, so this is the one place their shape is taken on trust.
   */
  mapOption: (raw: never) => Option;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /**
   * Whether the CALLER is still working out what belongs in this box.
   *
   * Not the picker's own list, which loads when the panel opens and says so
   * inside it. This is the case where the value itself is pending: the global
   * filter fetches the Active period to fill the field in, and until that lands
   * the box read `Any inspection period` in the muted placeholder colour, which
   * is a statement that nothing is chosen. A second later a value appeared
   * under the reader's cursor. A spinner and a locked control say "not yet"
   * where an empty box says "nothing".
   */
  loading?: boolean;
  invalid?: boolean;
  /** Gates the fetch independently of `open`: e.g. don't load until a parent is chosen. */
  enabled?: boolean;
  /**
   * Load without waiting for the panel to be opened.
   *
   * Off by default: a form with six of these would fire six requests nobody
   * asked for. On once a filter has been applied, so the narrowed list is
   * fetched the moment it changes rather than the next time somebody opens the
   * panel, which looked as though applying a filter had done nothing.
   */
  eager?: boolean;
  /**
   * Shown when the options are deliberately narrowed to a subset, with a way to lift it.
   * A picker that silently hides most of its rows looks broken; naming the narrowing and
   * offering the escape hatch is what makes it read as intentional.
   */
  scopeNotice?: { label: string; onClear: () => void } | null;
  /**
   * Whether the trigger offers a clear cross. On by default.
   *
   * Off where nothing selected is not a state the screen has: the inspections
   * workspace always shows one period, so clearing it would leave the page
   * looking at nothing with no way back except picking again.
   */
  clearable?: boolean;
}

/**
 * One option, or several.
 *
 * A discriminated union rather than two components, because everything that is
 * hard here is shared: the overlay positioning, the z-index stacking, the
 * outside-click binding, the paged fetch and the pinning of a selection that is
 * not on the loaded page. A second picker would be a copy of all of it that
 * drifts, and the multi case is the same control with a different answer.
 *
 * **The whole option, not just its id.** The id alone cannot render the
 * trigger, which is why this once needed a parallel `initialOption` prop and an
 * internal label cache. Holding the option means the caller already has what it
 * needs to display, and a form can store exactly what the API sends back.
 */
type InfiniteSelectProps = InfiniteSelectBaseProps &
  (
    | {
        multiple?: false;
        value: Option | null;
        onChange: (option: Option | null) => void;
      }
    | {
        multiple: true;
        value: Option[];
        onChange: (options: Option[]) => void;
      }
  );

/**
 * A paginated, searchable single-select for lists too large to load at once.
 *
 * Villages alone are ~71k rows, so options are fetched a page at a time with
 * `useInfiniteQuery`: the search term goes to the server, "Load more" appends the
 * next page, and the footer shows how many of the total are loaded.
 *
 * It is a plain button + panel rather than PrimeReact's AutoComplete on purpose.
 * AutoComplete with `forceSelection` clears its input on blur, so simply opening
 * the dropdown wiped the current selection. The trigger reuses the `.p-inputtext`
 * class so its height, padding and border still match every native PrimeReact
 * field beside it.
 */
export default function InfiniteSelect(props: InfiniteSelectProps) {
  const {
    queryKey,
    queryFn,
    mapOption,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    disabled,
    loading = false,
    invalid,
    enabled = true,
    eager = false,
    scopeNotice = null,
    clearable = true,
  } = props;

  const multiple = props.multiple === true;

  /**
   * The selection as a list, whichever mode this is in.
   *
   * Everything below reads this rather than branching on `multiple` at each
   * use: the panel, the pinning and the trigger all ask the same question,
   * "what is chosen", and only the two handlers care how many there can be.
   */
  const selected: Option[] = useMemo(
    () =>
      multiple
        ? ((props.value as Option[] | null) ?? [])
        : props.value
          ? [props.value as Option]
          : [],
    // Memoised because the pinning below depends on it: rebuilt on every render
    // it would be a new array each time and `visibleOptions` would recompute
    // for nothing.
    [multiple, props.value],
  );

  const toggle = (option: Option) => {
    if (!multiple) {
      (props.onChange as (o: Option | null) => void)(option);
      setOpen(false);

      return;
    }

    const already = selected.some((chosen) => chosen.value === option.value);

    // The panel stays open when picking several. Closing after each tick makes
    // choosing four votes four round trips through the trigger.
    (props.onChange as (o: Option[]) => void)(
      already
        ? selected.filter((chosen) => chosen.value !== option.value)
        : [...selected, option],
    );
  };

  const clear = () => {
    if (multiple) {
      (props.onChange as (o: Option[]) => void)([]);

      return;
    }

    (props.onChange as (o: Option | null) => void)(null);
  };

  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // One request per pause in typing rather than one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /**
   * Position the panel against the trigger.
   *
   * `DomHandler.alignOverlay` is the same call PrimeReact's own Dropdown makes.
   * It writes page coordinates, matches the panel's min-width to the trigger and
   * flips above when there is no room below, so none of that is reimplemented
   * here. Hand-rolled `getBoundingClientRect` maths was close but not the same,
   * and would drift from PrimeReact's behaviour the moment either changed.
   */
  const alignOverlay = useCallback(() => {
    const panel = panelRef.current;
    const trigger = ref.current;
    if (!panel || !trigger) return;

    DomHandler.alignOverlay(panel, trigger);
  }, []);

  /**
   * Outside click, window resize and ancestor scroll, in one binding.
   *
   * The scroll case is the one that is easy to get wrong by hand: the dialog a
   * picker sits in is its own scroll container, so its scroll never reaches
   * `window`. PrimeReact's hook walks the scrollable ancestors and binds to each.
   */
  const [bindOverlayListener, unbindOverlayListener] = useOverlayListener({
    target: ref,
    overlay: panelRef,
    listener: (event: Event, options?: { type?: string; valid?: boolean }) => {
      if (!options?.valid) return;

      if (options.type === "outside") {
        setOpen(false);
      } else {
        alignOverlay();
      }
    },
    when: open,
  });

  /**
   * Attach the listeners. `when` does NOT do this on its own.
   *
   * The trap, and it is a quiet one: `when: open` only decides whether the hook
   * resolves its target and overlay refs. It never calls `addEventListener`.
   * Read `useEventListener` in `primereact/hooks` and the `when` branch does
   * exactly one thing, `targetRef.current = getTargetElement(target)`; binding
   * is the caller's job through the returned pair.
   *
   * So this panel was fully wired for outside clicks and never listened for one,
   * and the only way to close it was to click the trigger again. PrimeReact's
   * own Dropdown calls `bindOverlayListener()` from `onOverlayEntered` for the
   * same reason, which is why its dropdowns close and this one did not.
   */
  useEffect(() => {
    if (!open) return;

    bindOverlayListener();

    return () => unbindOverlayListener();
  }, [open, bindOverlayListener, unbindOverlayListener]);

  /**
   * Stack above whatever is already open, and place it, before the first paint.
   *
   * A hand-picked z-index cannot work: `PrimeReact.zIndex` starts modals at 1100
   * and ZIndexUtils increments per open overlay, so any constant is either too
   * low (the panel drew behind the dialog containing it) or high enough to cover
   * toasts. Asking for an "overlay" slot puts it exactly one layer above the
   * current top, which is what every PrimeReact overlay does.
   */
  useIsomorphicLayoutEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;

    // `zIndex` is optional on PrimeReact's config type; 1000 is its own default.
    ZIndexUtils.set(
      "overlay",
      el,
      PrimeReact.autoZIndex,
      PrimeReact.zIndex?.overlay ?? 1000,
    );
    alignOverlay();

    // Released on close, or the counter climbs every time a picker is opened.
    return () => ZIndexUtils.clear(el);
  }, [open, alignOverlay]);

  const query = useInfiniteQuery({
    queryKey: [...queryKey, "infinite-select", search],
    queryFn: (ctx) => queryFn({ page: ctx.pageParam as number, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      return meta && meta.current_page < meta.last_page
        ? meta.current_page + 1
        : undefined;
    },
    // Nothing is fetched until the panel is opened, unless `eager`. A form with six of these
    // must not fire six requests on mount.
    enabled: (open || eager) && enabled,
  });

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = query;

  const options: Option[] = useMemo(() => {
    const rows = data?.pages?.flatMap((p) => p?.data?.data ?? []) ?? [];
    return rows.map((row) => mapOption(row as never));
  }, [data, mapOption]);

  const total: number | null = data?.pages?.[0]?.data?.meta?.total ?? null;

  /**
   * The list, with the current selection pinned on when it is not in it.
   *
   * Only the first page is loaded, so a selection made earlier is usually absent:
   * pick the parish Omoyo out of 10,691 and reopening the panel shows Aacha,
   * Aakum and nothing to say Omoyo is still chosen. Pinning it keeps the tick and
   * the highlight visible without loading 400 pages to reach it.
   *
   * Not pinned while searching. There the list is the answer to a question, and
   * a row that does not match the query would read as a result that does.
   */
  const visibleOptions: Option[] = useMemo(() => {
    if (selected.length === 0 || search !== "") return options;

    const loaded = new Set(options.map((o) => o.value));
    const missing = selected.filter((chosen) => !loaded.has(chosen.value));

    return missing.length > 0 ? [...missing, ...options] : options;
  }, [options, selected, search]);

  // The panel grows as pages load and shrinks as a search narrows it, and a
  // panel that flipped above the trigger is anchored by its top, so its bottom
  // edge would drift away from the field without this.
  useIsomorphicLayoutEffect(() => {
    if (open) alignOverlay();
  }, [open, visibleOptions.length, isPending, alignOverlay]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        // Locked while the value is being worked out. Opening a picker whose
        // own field is about to be filled in lets somebody choose and be
        // overwritten a moment later.
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className={`p-inputtext flex w-full items-center justify-between gap-2 text-left text-sm! ${
          invalid ? "p-invalid" : ""
        } ${
          disabled || loading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }`}
      >
        {/* The trigger stays one line so the control keeps its height, so the
            full text is carried in `title` for the cases the label outruns it. */}
        <span
          title={selected.map((o) => o.label).join(", ")}
          className={`truncate ${
            selected.length === 0
              ? "text-(--text-muted)"
              : "text-(--text-primary)"
          }`}
        >
          {loading
            ? "Loading"
            : selected.length === 0
              ? placeholder
              : selected.map((o) => o.label).join(", ")}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-(--text-muted)">
          {/* How many are chosen, where the joined labels have run out of room.
              A trigger reading "Arua City, Jinja City, Gulu…" cannot say
              whether that is three or thirty. */}
          {multiple && selected.length > 1 && (
            <span className="shrink-0 rounded-full bg-(--bg-page) px-1.5 py-0.5 text-[11px] font-semibold text-(--text-secondary)">
              {selected.length}
            </span>
          )}
          {selected.length > 0 && !disabled && !loading && clearable && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="pi pi-times text-xs hover:text-red-500"
            />
          )}
          <i
            className={`pi text-xs ${
              loading
                ? "pi-spin pi-spinner"
                : open
                  ? "pi-chevron-up"
                  : "pi-chevron-down"
            }`}
          />
        </span>
      </button>

      {/* Rendered into `document.body`, which is where PrimeReact's own Portal
          puts an overlay when no global `appendTo` is configured, and this app
          configures none. `primereact/portal` itself ships no typings, so its
          wrapper would be an implicit `any` for no behavioural gain. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            /*
             * `absolute`, because alignOverlay writes page coordinates. Top and
             * left are set by it, not here.
             *
             * The WIDTH is capped here and nowhere else. alignOverlay sets a
             * min-width from the trigger and no maximum, so the panel grew to
             * whatever the longest option needed: `CAT61` is 349 characters and
             * one category list stretched clean across the viewport. With a
             * ceiling the labels wrap, which they were already written to do.
             */
            style={{
              position: "absolute",
              maxWidth: "min(34rem, calc(100vw - 2rem))",
            }}
            className="overflow-hidden rounded-lg border border-(--border-color) bg-(--bg-card) shadow-lg"
          >
            <div className="flex items-center gap-2 border-b border-(--border-color) p-2">
              <i className="pi pi-search text-sm text-(--text-muted)" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-(--text-primary) outline-none placeholder:text-(--text-muted)"
                autoFocus
              />
            </div>

            {scopeNotice && (
              <div className="flex items-center gap-2 border-b border-(--border-color) bg-(--bg-page) px-2 py-1.5">
                <i className="pi pi-filter-fill text-[10px] text-(--brand-mid)" />
                <span className="truncate text-xs text-(--text-secondary)">
                  {scopeNotice.label}
                </span>
                <button
                  type="button"
                  onClick={scopeNotice.onClear}
                  className="ml-auto shrink-0 text-xs font-medium text-(--brand-mid) hover:underline"
                >
                  Show all
                </button>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {!enabled ? (
                <div className="px-3 py-6 text-center text-sm text-(--text-muted)">
                  Choose the level above first.
                </div>
              ) : isPending ? (
                <div className="px-3 py-6 text-center text-sm text-(--text-muted)">
                  <i className="pi pi-spin pi-spinner" />
                </div>
              ) : isError ? (
                <div className="px-3 py-6 text-center text-sm text-red-500">
                  Failed to load options.
                </div>
              ) : visibleOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-(--text-muted)">
                  No results.
                </div>
              ) : (
                visibleOptions.map((o) => {
                  const isSelected = selected.some(
                    (chosen) => chosen.value === o.value,
                  );

                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        if (o.disabled) return;

                        toggle(o);
                      }}
                      disabled={o.disabled}
                      // `items-start`, because a wrapped label is taller than the
                      // tick beside it and centring would float the tick mid-text.
                      className={`flex w-full items-start justify-between gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                        o.disabled
                          ? "cursor-not-allowed opacity-60"
                          : "hover:bg-(--bg-page)"
                      } ${isSelected ? "bg-(--brand-light) dark:bg-(--rose)" : ""}`}
                    >
                      {/* Wraps rather than truncating. This picker started out
                        holding village names, where a clipped label was still
                        recognisable; it now also holds objectives, which are
                        whole sentences that differ only near the end. */}
                      <span
                        className={`wrap-break-word ${
                          isSelected
                            ? "font-medium text-(--brand-ink) dark:text-(--accent-mid)"
                            : "text-(--text-secondary)"
                        }`}
                      >
                        {o.label}
                      </span>
                      {o.note && (
                        <span className="mt-0.5 shrink-0 rounded-full bg-(--bg-page) px-2 py-0.5 text-[11px] font-medium text-(--text-muted)">
                          {o.note}
                        </span>
                      )}
                      {isSelected && !o.note && (
                        <i className="pi pi-check mt-0.5 shrink-0 text-xs text-(--brand-mid)" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {hasNextPage && (
              <div className="border-t border-(--border-color) p-1.5">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full rounded-md py-1.5 text-xs font-medium text-(--text-secondary) hover:bg-(--bg-page) disabled:opacity-60"
                >
                  {isFetchingNextPage ? (
                    <>
                      <i className="pi pi-spin pi-spinner text-[10px]" />{" "}
                      Loading…
                    </>
                  ) : (
                    <>
                      <i className="pi pi-chevron-down text-[10px]" /> Load more
                    </>
                  )}
                </button>
              </div>
            )}

            {total != null && options.length > 0 && (
              <div className="border-t border-(--border-color) px-3 py-1.5 text-center text-[11px] text-(--text-muted)">
                Showing {options.length} of {total.toLocaleString()}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
