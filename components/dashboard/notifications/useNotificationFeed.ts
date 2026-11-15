"use client";

import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationPage,
} from "@/services/notifications/notifications-service";

/**
 * The person's notices as a feed (Alpha's NotificationBell pattern): pages with Load more, and
 * every action shown at once on every copy of the feed (the bell and the Notifications page share
 * the "notifications" root), then put back if the API says no. Marking read and removing are
 * idempotent on the API, so a second press or another tab is never an error.
 */
type Feed = InfiniteData<NotificationPage, number>;

export const NOTIFICATIONS_ROOT = ["notifications"] as const;

export function useNotificationFeed({
  scope,
  perPage,
  unreadOnly = false,
  enabled = true,
  refetchInterval,
}: {
  scope: string;
  perPage: number;
  unreadOnly?: boolean;
  enabled?: boolean;
  /** The bell keeps its count current between live signals. */
  refetchInterval?: number;
}) {
  const queryClient = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_ROOT, scope, unreadOnly],
    queryFn: ({ pageParam }) => getNotifications(pageParam, perPage, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    enabled,
    refetchInterval,
  });

  // A notice arriving between two page fetches shifts the rest down a place: keep each id once.
  const items: AppNotification[] = Array.from(new Map((feed.data?.pages.flatMap((p) => p.data) ?? []).map((n) => [n.id, n])).values());
  const first = feed.data?.pages[0];
  const unread = first?.unread_count ?? 0;
  const total = first?.meta.total ?? 0;

  /** Change every cached copy of the feed; answers what to put back if the API refuses. */
  const patch = async (fn: (feed: Feed) => Feed) => {
    await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_ROOT });
    const before = queryClient.getQueriesData<Feed>({ queryKey: NOTIFICATIONS_ROOT });
    queryClient.setQueriesData<Feed>({ queryKey: NOTIFICATIONS_ROOT }, (old) => (old?.pages ? fn(old) : old));
    return before;
  };
  const restore = (before?: [QueryKey, Feed | undefined][]) => before?.forEach(([key, data]) => queryClient.setQueryData(key, data));
  const settle = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_ROOT });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id: string) =>
      patch((old) => {
        const wasUnread = old.pages.some((p) => p.data.some((n) => n.id === id && !n.read_at));
        if (!wasUnread) return old;
        const now = new Date().toISOString();
        const pages = old.pages.map((p) => ({ ...p, data: p.data.map((n) => (n.id === id ? { ...n, read_at: now } : n)) }));
        pages[0] = { ...pages[0], unread_count: Math.max(0, pages[0].unread_count - 1) };
        return { ...old, pages };
      }),
    onError: (_e, _id, before) => restore(before),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () =>
      patch((old) => {
        const now = new Date().toISOString();
        const pages = old.pages.map((p) => ({ ...p, data: p.data.map((n) => (n.read_at ? n : { ...n, read_at: now })) }));
        pages[0] = { ...pages[0], unread_count: 0 };
        return { ...old, pages };
      }),
    onError: (_e, _v, before) => restore(before),
    onSettled: settle,
  });

  // Gone from the screen at once, so it cannot be pressed twice.
  const remove = useMutation({
    mutationFn: deleteNotification,
    onMutate: (id: string) =>
      patch((old) => {
        const target = old.pages.flatMap((p) => p.data).find((n) => n.id === id);
        if (!target) return old;
        const pages = old.pages.map((p) => ({ ...p, data: p.data.filter((n) => n.id !== id) }));
        pages[0] = {
          ...pages[0],
          unread_count: Math.max(0, pages[0].unread_count - (target.read_at ? 0 : 1)),
          meta: { ...pages[0].meta, total: Math.max(0, pages[0].meta.total - 1) },
        };
        return { ...old, pages };
      }),
    onError: (_e, _id, before) => restore(before),
    onSettled: settle,
  });

  return { feed, items, unread, total, markRead, markAll, remove };
}
