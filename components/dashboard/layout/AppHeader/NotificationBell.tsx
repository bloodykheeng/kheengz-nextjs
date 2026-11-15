"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { MdArrowOutward, MdOutlineNotifications } from "react-icons/md";
import { getEcho } from "@/lib/echo";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import type { AppNotification } from "@/services/notifications/notifications-service";
import { NOTIFICATIONS_ROOT, useNotificationFeed } from "@/components/dashboard/notifications/useNotificationFeed";
import { timeAgo } from "@/lib/format";
import { LIVE_ROOTS, type RecordsChanged } from "@/lib/liveRecords";
import { useResetWhen } from "@/hooks/useResetOnOpen";

/** One style per notice kind: KheengzNotification::kind() on the API (order, payout, stock, warning, vendor, shop, account). */
export const KIND_STYLE: Record<string, { icon: string; tone: string }> = {
  order: { icon: "pi-shopping-bag", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  payout: { icon: "pi-wallet", tone: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  stock: { icon: "pi-box", tone: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  warning: { icon: "pi-exclamation-triangle", tone: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
  vendor: { icon: "pi-briefcase", tone: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  shop: { icon: "pi-shop", tone: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  account: { icon: "pi-user", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

/**
 * One notice in the bell (Alpha's): read once it is half in view; tapping the text opens it out
 * (and reads it), only the ↗ goes to the record, so reading never sends anyone away.
 */
function BellItem({ n, onRead, onOpen }: { n: AppNotification; onRead: (id: string) => void; onOpen: (n: AppNotification) => void }) {
  const [expanded, setExpanded] = useState(false);
  const style = KIND_STYLE[n.kind] ?? KIND_STYLE.account;
  const { ref } = useInView({
    threshold: 0.5,
    triggerOnce: true,
    skip: !!n.read_at,
    onChange: (inView) => {
      if (inView && !n.read_at) onRead(n.id);
    },
  });

  return (
    <li ref={ref} className={`flex items-start gap-3 px-4 py-3 ${n.read_at ? "" : "bg-(--brand-light)/40"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
        <span className={`pi ${style.icon} text-sm`} aria-hidden />
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        aria-expanded={expanded}
        onClick={() => {
          if (!n.read_at) onRead(n.id);
          setExpanded((e) => !e);
        }}
      >
        <span className={`block text-sm font-semibold text-(--text-primary) ${expanded ? "" : "truncate"}`}>{n.title}</span>
        <span className={`block text-xs text-(--text-secondary) ${expanded ? "" : "line-clamp-2"}`}>{n.body}</span>
        <span className="mt-0.5 block text-[0.65rem] text-(--text-muted)">{timeAgo(n.created_at)}</span>
      </button>
      {n.link && (
        <button
          type="button"
          onClick={() => onOpen(n)}
          title="Open"
          aria-label={`Open: ${n.title}`}
          className="mt-0.5 shrink-0 rounded-md p-1 text-(--brand-ink) transition-colors hover:bg-(--sidebar-hover-bg)"
        >
          <MdArrowOutward className="text-base" />
        </button>
      )}
    </li>
  );
}

const Section = ({ label, count }: { label: string; count: number }) => (
  <li className="sticky top-0 z-10 border-b border-(--border-color) bg-(--bg-card)/95 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-(--text-muted) backdrop-blur-sm">
    {label} <span className="text-(--text-secondary)">{count}</span>
  </li>
);

/**
 * The bell: the person's notices as a feed with Load more (useNotificationFeed), New and Earlier.
 * Notices arrive live on the private channel `App.Models.User.{id}` (a toast, and the feed
 * refetches); the API is the record, so a missed socket message is only late, never lost. The same
 * channel carries `records.changed`, which refetches the screens it names (lib/liveRecords.ts).
 */
export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { feed, items, unread, markRead, markAll } = useNotificationFeed({ scope: "bell", perPage: 10, enabled: !!user?.id, refetchInterval: 120_000 });

  // "New" holds what was unread when the panel opened, so a row read while scrolling stays put.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [openedAt, setOpenedAt] = useState(0);
  // Taken when the panel opens and as new pages arrive, before the paint.
  useResetWhen(`${open}|${openedAt}|${feed.dataUpdatedAt}`, () => {
    if (!open) return;
    setNewIds((prev) => {
      const next = new Set(prev);
      items.forEach((n) => !n.read_at && next.add(n.id));
      return next.size === prev.size ? prev : next;
    });
  });

  useEffect(() => {
    if (!user?.id) return;
    const echo = getEcho();
    if (!echo) return;
    const channelName = `App.Models.User.${user.id}`;
    const channel = echo.private(channelName);
    channel.notification((n: AppNotification) => {
      toast.info(n.title, n.body);
      // The database row and the broadcast are separate queued jobs: the socket can beat the row
      // into the table, so refetch now and once more shortly.
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_ROOT });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_ROOT }), 2500);
    });
    // One listener for records.changed, here: leaving the channel elsewhere would tear this one down.
    channel.listen(".records.changed", (change: RecordsChanged) => {
      (LIVE_ROOTS[change.resource] ?? []).forEach((root) => queryClient.invalidateQueries({ queryKey: [root] }));
    });
    return () => echo.leave(channelName);
  }, [user?.id, queryClient, toast]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openNotice = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const isNew = (n: AppNotification) => newIds.has(n.id) || !n.read_at;
  const fresh = items.filter(isNew);
  const earlier = items.filter((n) => !isNew(n));
  const read = (id: string) => markRead.mutate(id);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            // Fresh on open: an Admin may have edited, ended or deactivated a notice since.
            void feed.refetch();
            setNewIds(new Set());
            setOpenedAt(Date.now());
          }
          setOpen(!open);
        }}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg)"
      >
        <MdOutlineNotifications className="text-xl" />
        {feed.isPending ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--bg-card)">
            <span aria-hidden className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-(--text-muted) border-t-transparent" />
          </span>
        ) : (
          unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white ring-2 ring-(--bg-card)">
              {unread > 99 ? "99+" : unread}
            </span>
          )
        )}
      </button>

      {/* On a phone the panel spans the screen under the header; from sm up it drops from the bell. */}
      {open && (
        <div className="fixed inset-x-3 top-18 z-50 overflow-hidden rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-(--border-color) px-4 py-3">
            <p className="text-sm font-semibold text-(--text-primary)">Notifications{unread > 0 ? ` (${unread})` : ""}</p>
            {unread > 0 && (
              <button type="button" className="text-xs font-semibold text-(--brand-ink) hover:underline disabled:opacity-50" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-104 overflow-y-auto">
            {feed.isPending ? (
              <li className="px-4 py-10 text-center text-(--text-muted)">
                <span className="pi pi-spin pi-spinner" aria-hidden />
              </li>
            ) : items.length === 0 ? (
              // A column, not inline: PrimeIcons' `.pi` keeps the icon inline whatever `block` says.
              <li className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-(--text-muted)">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--bg-page)">
                  <span className="pi pi-bell text-xl" aria-hidden />
                </span>
                <span>You are all caught up. New orders, payouts and updates show here.</span>
              </li>
            ) : (
              <>
                {fresh.length > 0 && <Section label="New" count={fresh.length} />}
                {fresh.map((n) => (
                  <BellItem key={n.id} n={n} onRead={read} onOpen={openNotice} />
                ))}
                {earlier.length > 0 && fresh.length > 0 && <Section label="Earlier" count={earlier.length} />}
                {earlier.map((n) => (
                  <BellItem key={n.id} n={n} onRead={read} onOpen={openNotice} />
                ))}
                <li className="flex justify-center px-4 py-3">
                  {feed.hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => feed.fetchNextPage()}
                      disabled={feed.isFetchingNextPage}
                      className="inline-flex items-center gap-2 rounded-lg border border-(--border-color) bg-(--bg-page) px-4 py-1.5 text-xs font-semibold text-(--text-secondary) hover:bg-(--sidebar-hover-bg) disabled:opacity-60"
                    >
                      {feed.isFetchingNextPage ? (
                        <>
                          <span className="pi pi-spin pi-spinner text-[0.6rem]" aria-hidden /> Loading…
                        </>
                      ) : (
                        <>
                          <span className="pi pi-chevron-down text-[0.6rem]" aria-hidden /> Load more
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-[0.7rem] text-(--text-muted)">That is everything</p>
                  )}
                </li>
              </>
            )}
          </ul>
          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block border-t border-(--border-color) px-4 py-2.5 text-center text-sm font-semibold text-(--brand-ink) hover:bg-(--sidebar-hover-bg)">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
