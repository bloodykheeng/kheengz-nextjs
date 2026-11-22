/**
 * Loading shapes, built from the same frames as the page they become (copied from Letshego, whose user said: "the
 * skeleton doesn't match the data they display, and it's not only in this place"). A page that loads shows its own
 * header, figure cards, cards with label/value rows and tables in the places they will appear; never one grey block
 * and never a blank page. Compose a page's shape from these pieces beside its real layout (docs/dashboard-patterns.md
 * §19). Used by each route's loading.tsx, each page's <Suspense> fallback and the record components while they load.
 */

const tone = "animate-pulse rounded bg-(--border-color)";

/** A line of text to come: width as a Tailwind class. */
export function Bar({ w = "w-32", h = "h-3.5", className = "" }: { w?: string; h?: string; className?: string }) {
  return <span className={`block ${tone} ${w} ${h} ${className}`} />;
}

/** A record's header card: an initials circle (or none), the name with its tags, two lines, the buttons on the right. */
export function HeaderSkeleton({ avatar = true, buttons = 2 }: { avatar?: boolean; buttons?: number }) {
  return (
    <section className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
      <div className="flex flex-wrap items-start gap-4">
        {avatar && <span className={`size-16 shrink-0 rounded-full ${tone}`} />}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <Bar w="w-56" h="h-7" />
            <Bar w="w-20" h="h-6" className="rounded-full" />
          </div>
          <Bar w="w-80 max-w-full" />
          <Bar w="w-[28rem] max-w-full" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: buttons }, (_, i) => (
            <Bar key={i} w="w-32" h="h-11" className="rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  );
}

/** A page heading (title, subtitle) with its buttons, as PageHeader lays them out. */
export function PageHeaderSkeleton({ buttons = 2 }: { buttons?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Bar w="w-64" h="h-8" />
          <Bar w="w-20" h="h-6" className="rounded-full" />
        </div>
        <Bar w="w-96 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: buttons }, (_, i) => (
          <Bar key={i} w="w-32" h="h-11" className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** The tab bar of a record (its labels to come), the first tab underlined. */
export function TabsSkeleton({ tabs = 5 }: { tabs?: number }) {
  return (
    <div className="flex gap-8 border-b border-(--border-color) px-6 py-4">
      {Array.from({ length: tabs }, (_, i) => (
        <Bar key={i} w={i === 0 ? "w-20" : "w-24"} h="h-5" />
      ))}
    </div>
  );
}

/** A row of figure cards (StatCard): an icon, a label, a figure and a hint. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  const cols = count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        // As StatCard reads: the label top left, its icon top right, the figure, the hint under it.
        <div key={i} className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-6 shadow-(--shadow-sm)">
          <div className="flex items-start justify-between">
            <Bar w="w-28" h="h-3" />
            <span className={`size-11 shrink-0 rounded-xl ${tone}`} />
          </div>
          <Bar w="w-20" h="h-8" className="mt-3" />
          <Bar w="w-40" h="h-3" className="mt-3" />
        </div>
      ))}
    </div>
  );
}

/** A card (Card) with its title and label/value rows, two to a line as the details read. */
export function DetailsCardSkeleton({ rows = 6, title = true }: { rows?: number; title?: boolean }) {
  return (
    <section className="min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
      {title && (
        <header className="border-b border-(--border-color) px-5 py-3.5">
          <Bar w="w-28" h="h-4" />
        </header>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bar w="w-20" h="h-3" />
            <Bar w={i % 3 === 0 ? "w-40" : "w-32"} h="h-4" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Widths cycled through so the bars vary without changing on every render (as the standard table's skeleton). */
const CELL_W = [72, 88, 54, 78, 63, 90, 45, 82, 58, 95, 68, 84];

/**
 * A card holding the standard table, as it will look: the card's title, the table's frame with its toolbar buttons on
 * the right, the header row and the rows spread across the whole width (one cell per column, never bunched to the
 * left), the round View button, and the pager.
 */
export function TableCardSkeleton({ rows = 5, columns = 5, title = true, actions = true }: { rows?: number; columns?: number; title?: boolean; actions?: boolean }) {
  return (
    <section className="min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
      {title && (
        <header className="border-b border-(--border-color) px-5 py-3.5">
          <Bar w="w-36" h="h-4" />
        </header>
      )}
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-(--border-color)">
          <div className="flex justify-end gap-2 border-b border-(--border-color) px-4 py-3">
            <Bar w="w-14" h="h-11" className="rounded-lg" />
            <Bar w="w-14" h="h-11" className="rounded-lg" />
          </div>
          <div className="flex items-center gap-6 border-b border-(--border-color) bg-(--bg-page) px-4 py-4">
            {Array.from({ length: columns }, (_, c) => (
              <span key={c} className="flex-1">
                <Bar w="" h="h-3" className="w-full" />
              </span>
            ))}
            {actions && <span className="w-16 shrink-0"><Bar w="w-full" h="h-3" /></span>}
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-6 border-b border-(--border-color) px-4 py-5 last:border-0">
              {Array.from({ length: columns }, (_, c) => (
                <span key={c} className="flex-1">
                  <span className={`block h-4 ${tone}`} style={{ width: `${CELL_W[(r * columns + c) % CELL_W.length]}%` }} />
                </span>
              ))}
              {actions && <span className={`size-12 shrink-0 rounded-full ${tone}`} />}
            </div>
          ))}
          <div className="flex items-center justify-center gap-3 border-t border-(--border-color) px-4 py-4">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`size-9 rounded-full ${tone}`} />
            ))}
            <Bar w="w-32" h="h-3.5" className="ml-3" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A card holding a map: its title and the map's frame. */
export function MapCardSkeleton({ height = "h-80" }: { height?: string }) {
  return (
    <section className="min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
      <header className="border-b border-(--border-color) px-5 py-3.5">
        <Bar w="w-24" h="h-4" />
      </header>
      <div className="p-5">
        <span className={`block w-full rounded-xl ${tone} ${height}`} />
      </div>
    </section>
  );
}

/** A numbered timeline (History): a circle and two lines per entry. */
export function TimelineSkeleton({ entries = 5 }: { entries?: number }) {
  return (
    <ol className="m-0 space-y-4 p-0" aria-label="Loading the history">
      {Array.from({ length: entries }, (_, i) => (
        <li key={i} className="flex list-none items-start gap-3">
          <span className={`size-7 shrink-0 rounded-full ${tone}`} />
          <span className="flex-1 space-y-2">
            <Bar w={i % 2 ? "w-56" : "w-44"} h="h-4" />
            <Bar w="w-80 max-w-full" h="h-3" />
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- whole pages, used by loading.tsx and the pages */

/** A list page: its heading, then the standard table with search and Filters on the left, its buttons on the right. */
export function ListPageSkeleton({ padded = true }: { padded?: boolean }) {
  return (
    <div className={`space-y-5 ${padded ? "p-4 sm:p-6" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <Bar w="w-64" h="h-8" />
        <Bar w="w-96 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm)">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-color) px-4 py-4">
          <div className="flex gap-2">
            <Bar w="w-80 max-w-[50vw]" h="h-14" className="rounded-lg" />
            <Bar w="w-32" h="h-14" className="rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Bar w="w-40" h="h-14" className="rounded-lg" />
            <Bar w="w-14" h="h-14" className="rounded-lg" />
            <Bar w="w-14" h="h-14" className="rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-6 border-b border-(--border-color) bg-(--bg-page) px-4 py-4">
          <span className={`size-5 shrink-0 rounded ${tone}`} />
          {Array.from({ length: 5 }, (_, c) => (
            <span key={c} className="flex-1">
              <Bar w="w-1/2" h="h-3" />
            </span>
          ))}
          <span className="w-24 shrink-0">
            <Bar w="w-full" h="h-3" />
          </span>
        </div>
        {Array.from({ length: 5 }, (_, r) => (
          <div key={r} className="flex items-center gap-6 border-b border-(--border-color) px-4 py-6 last:border-0">
            <span className={`size-5 shrink-0 rounded ${tone}`} />
            {Array.from({ length: 5 }, (_, c) => (
              <span key={c} className="flex-1 space-y-2">
                <span className={`block h-4 ${tone}`} style={{ width: `${CELL_W[(r * 5 + c) % CELL_W.length]}%` }} />
                {c === 0 && <Bar w="w-20" h="h-3" />}
              </span>
            ))}
            <span className="flex w-24 shrink-0 gap-2">
              <span className={`size-11 rounded-full ${tone}`} />
              <span className={`size-11 rounded-full ${tone}`} />
            </span>
          </div>
        ))}
        <div className="flex items-center justify-center gap-3 border-t border-(--border-color) px-4 py-4">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`size-9 rounded-full ${tone}`} />
          ))}
          <Bar w="w-32" h="h-3.5" className="ml-3" />
        </div>
      </div>
    </div>
  );
}

/** A dashboard or report: the heading with its period bar, the figure cards, two chart cards. */
export function ReportPageSkeleton({ padded = true }: { padded?: boolean }) {
  return (
    <div className={`space-y-5 ${padded ? "p-4 sm:p-6" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Bar w="w-56" h="h-8" />
          <Bar w="w-40" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Bar w="w-80" h="h-11" className="rounded-lg" />
          <Bar w="w-32" h="h-11" className="rounded-lg" />
          <Bar w="w-28" h="h-11" className="rounded-lg" />
          <Bar w="w-28" h="h-11" className="rounded-lg" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-4 shadow-(--shadow-sm)">
            <div className="flex items-center gap-2.5">
              <span className={`size-9 rounded-xl ${tone}`} />
              <Bar w="w-24" />
            </div>
            <Bar w="w-20" h="h-7" className="mt-3" />
            <Bar w="w-32" h="h-3" className="mt-2" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
            <Bar w="w-28" h="h-4" />
            <Bar w="w-40" h="h-3" className="mt-2" />
            <span className={`mt-5 block h-72 w-full rounded-xl ${tone}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A page of cards (the calculator, a profile, the manual): its heading and two cards side by side. */
export function CardsPageSkeleton({ padded = true }: { padded?: boolean }) {
  return (
    <div className={`space-y-5 ${padded ? "p-4 sm:p-6" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <Bar w="w-56" h="h-8" />
        <Bar w="w-96 max-w-full" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <DetailsCardSkeleton rows={6} />
        <DetailsCardSkeleton rows={6} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Kheengz's record pages */

/** A shop: its heading with the actions, then details, payout, locations and history, two to a row. */
export function ShopRecordSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the shop">
      <PageHeaderSkeleton buttons={3} />
      <div className="grid gap-5 xl:grid-cols-2">
        <DetailsCardSkeleton rows={6} />
        <DetailsCardSkeleton rows={2} />
        <DetailsCardSkeleton rows={4} />
        <section className="min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
          <TimelineSkeleton entries={3} />
        </section>
      </div>
    </div>
  );
}

/** A vendor (My business, or the review page): heading, papers, payout destinations, people and details. */
export function VendorRecordSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the vendor">
      <PageHeaderSkeleton buttons={2} />
      <div className="grid gap-5 xl:grid-cols-2">
        <DetailsCardSkeleton rows={4} />
        <DetailsCardSkeleton rows={4} />
        <DetailsCardSkeleton rows={2} />
        <DetailsCardSkeleton rows={6} />
      </div>
    </div>
  );
}

/** A product's editor: the form's cards on the left, status, stock and photos on the right (first on a phone). */
export function ProductRecordSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the product">
      <PageHeaderSkeleton buttons={0} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <DetailsCardSkeleton rows={3} />
          <DetailsCardSkeleton rows={4} />
          <DetailsCardSkeleton rows={6} />
        </div>
        <div className="order-first min-w-0 space-y-5 xl:order-none">
          <DetailsCardSkeleton rows={2} />
          <DetailsCardSkeleton rows={2} />
          <section className="min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
            <div className="grid grid-cols-2 gap-3">
              <span className="block aspect-square animate-pulse rounded-xl bg-(--border-color)" />
              <span className="block aspect-square animate-pulse rounded-xl bg-(--border-color)" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
