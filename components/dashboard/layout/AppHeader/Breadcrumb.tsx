"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdHome, MdChevronRight } from "react-icons/md";

import { useBreadcrumbState } from "@/contexts/BreadcrumbContext";
import { useHydrated } from "@/hooks/useHydrated";
import { listReturnUrl } from "@/lib/listReturn";

// Where the URL segment and the sidebar label differ. Anything not listed is
// capitalised from the segment ("groups" -> "Groups"), which covers most pages.
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  faqs: "FAQs",
  roles: "Roles & permissions",
  "audit-trail": "Audit trail",
  announcements: "Send notifications",
  requests: "Category requests",
};

/**
 * Does this segment look like a record id rather than a word?
 *
 * ULIDs (26 of Crockford's base32) and UUIDs, which is everything this app puts
 * in a URL. Matched by shape rather than by a list of routes, so a detail page
 * added tomorrow does not have to remember to opt in.
 */
/** Segments that are only a step in an address, with no page of their own: shown, never linked. */
const NO_PAGE = new Set(["/dashboard/products"]);

function looksLikeAnId(seg: string): boolean {
  return /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/.test(seg) || /^[0-9a-f-]{36}$/i.test(seg);
}

function label(seg: string) {
  return (
    routeLabels[seg] ??
    seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")
  );
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // `claimed` says a route has taken responsibility for naming this record;
  // `title` is the name once it has it. The two are separate so a crumb that is
  // still loading can show a skeleton rather than a word that names nothing.
  const { claimed, title: recordTitle } = useBreadcrumbState();
  // A list link returns to where the list was left (lib/listReturn.ts), once the browser can read it.
  const hydrated = useHydrated();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/"
        aria-label="Home"
        className="flex items-center text-(--text-muted) transition-colors hover:text-(--text-primary)"
      >
        <MdHome className="text-[17px]" />
      </Link>

      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;

        // An ID is never shown. What replaces it depends on whether anybody is
        // coming with a name:
        //
        //   a route claimed it and has one   the name
        //   a route claimed it, still loading  a skeleton, below
        //   nobody claimed it                "Details"
        const isRecord = looksLikeAnId(seg);
        const isResolving = isRecord && claimed && recordTitle === null;
        const text = isRecord ? (recordTitle ?? "Details") : label(seg);

        return (
          <span key={`${seg}-${i}`} className="flex items-center gap-1">
            <MdChevronRight className="shrink-0 text-base text-(--text-muted)" />
            {isResolving ? (
              // The shape of the answer while it is on its way, which is what
              // every other loading state in this app shows. It replaced the
              // word "Details" flashing for the length of one request and then
              // being overwritten by the vote's name.
              <span
                aria-label="Loading"
                className="inline-block h-4 w-24 animate-pulse rounded bg-(--border-color) align-middle"
              />
            ) : isLast || NO_PAGE.has(href) ? (
              <span className={`max-w-[45vw] truncate sm:max-w-none ${isLast ? "font-semibold text-(--text-primary)" : "text-(--text-muted)"}`}>
                {text}
              </span>
            ) : (
              <Link
                href={hydrated && !isRecord ? listReturnUrl(href) : href}
                className="text-(--text-muted) transition-colors hover:text-(--text-primary)"
              >
                {text}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
