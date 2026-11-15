"use client";

import React, { useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { Button } from "primereact/button";
import { MdArrowOutward } from "react-icons/md";
import type { AppNotification } from "@/services/notifications/notifications-service";
import { KIND_STYLE } from "@/components/dashboard/layout/AppHeader/NotificationBell";
import { useNotificationFeed } from "@/components/dashboard/notifications/useNotificationFeed";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { dateTime, timeAgo } from "@/lib/format";

/**
 * Every notice for the signed-in person, newest first: the bell's feed (useNotificationFeed) in
 * full, 5 at a time with Load more. Tapping a notice reads it; Open goes to its record; Remove takes
 * it off at once (it cannot be pressed twice) and is put back only if the API says no.
 */
export default function NotificationsList() {
  const router = useAppRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { feed, items, unread, total, markRead, markAll, remove } = useNotificationFeed({ scope: "page", perPage: 5, unreadOnly });

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={feed.data ? `${unread} unread` : undefined}
        actions={
          <>
            <Button size="small" outlined label={unreadOnly ? "Show all" : "Unread only"} onClick={() => setUnreadOnly((v) => !v)} />
            <Button size="small" label="Mark all read" icon="pi pi-check" disabled={!unread || markAll.isPending} loading={markAll.isPending} onClick={() => markAll.mutate()} />
          </>
        }
      />

      {feed.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-(--bg-card)" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="pi-bell" title={unreadOnly ? "All caught up" : "No notifications yet"} body="New orders, payouts, low stock and account updates appear here as they happen." />
      ) : (
        <>
          <ul className="divide-y divide-(--border-color) overflow-hidden rounded-2xl border border-(--border-color) bg-(--bg-card)">
            {items.map((n) => {
              const style = KIND_STYLE[n.kind] ?? KIND_STYLE.account;
              return (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-4 sm:px-5 ${n.read_at ? "" : "bg-(--brand-light)/40"}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
                    <span className={`pi ${style.icon}`} aria-hidden />
                  </span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => !n.read_at && markRead.mutate(n.id)}>
                    <span className="block font-semibold text-(--text-primary)">
                      {n.title}
                      {!n.read_at && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-(--brand) align-middle" aria-label="Unread" />}
                    </span>
                    <span className="block text-sm text-(--text-secondary)">{n.body}</span>
                    <span className="mt-1 block text-xs text-(--text-muted)" title={dateTime(n.created_at)}>
                      {timeAgo(n.created_at)}
                    </span>
                  </button>
                  {/* One under the other on a phone, so the text keeps its width. */}
                  <div className="-mr-1 flex shrink-0 flex-col items-center gap-1 sm:mr-0 sm:flex-row">
                    {n.link && (
                      <button
                        type="button"
                        aria-label={`Open: ${n.title}`}
                        title="Open"
                        onClick={() => open(n)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-(--brand-ink) transition-colors hover:bg-(--sidebar-hover-bg)"
                      >
                        <MdArrowOutward className="text-lg" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove: ${n.title}`}
                      title="Remove"
                      onClick={() => remove.mutate(n.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--sidebar-hover-bg) hover:text-(--text-primary)"
                    >
                      <span className="pi pi-times text-sm" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-(--text-muted)">
              Showing {items.length} of {total}
            </p>
            {feed.hasNextPage && (
              <Button
                size="small"
                outlined
                icon="pi pi-chevron-down"
                label={feed.isFetchingNextPage ? "Loading…" : "Load more"}
                loading={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
