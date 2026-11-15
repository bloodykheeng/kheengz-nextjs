"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getEcho } from "@/lib/echo";
import { useAuth } from "@/contexts/AuthContext";

export interface OnlineMember {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  photo_url?: string | null;
}

interface OnlineStatusValue {
  members: OnlineMember[];
  onlineIds: Set<string>;
  count: number;
  isOnline: (id: string) => boolean;
}

const OnlineStatusCtx = createContext<OnlineStatusValue | null>(null);

/**
 * Joins the Reverb `online` presence channel while mounted and tracks the live
 * member list through Echo's here() / joining() / leaving() callbacks.
 *
 * The payload for each member is whatever `routes/channels.php` returns for the
 * `online` channel, so adding a field there makes it available here.
 */
export default function OnlineStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [members, setMembers] = useState<OnlineMember[]>([]);

  // Gate on a *validated* session rather than the raw cookie: after a
  // `migrate:fresh` the cookie still holds a token whose user no longer exists,
  // and joining with it just fails the presence auth. `isAuthenticated` only
  // flips true once the profile request comes back.
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const echo = getEcho();
    if (!echo) return;

    const sameId = (a: OnlineMember, b: OnlineMember) => String(a.id) === String(b.id);

    echo
      .join("online")
      .here((users: OnlineMember[]) => setMembers(Array.isArray(users) ? users : []))
      .joining((user: OnlineMember) =>
        setMembers((prev) => (prev.some((u) => sameId(u, user)) ? prev : [...prev, user]))
      )
      .leaving((user: OnlineMember) =>
        setMembers((prev) => prev.filter((u) => !sameId(u, user)))
      )
      // Presence is best-effort: a failed auth (stale token, a reconnect after the
      // laptop woke up) only means the online dots do not show. Warn rather than
      // error so the Next dev overlay does not raise it as a page fault.
      .error((err: unknown) =>
        console.warn("[presence] online channel unavailable (non-fatal)", err)
      );

    return () => {
      try {
        echo.leave("online");
      } catch {
        /* socket already gone: nothing to leave */
      }
      setMembers([]);
    };
  }, [isAuthenticated]);

  const value = useMemo<OnlineStatusValue>(() => {
    const onlineIds = new Set(members.map((m) => String(m.id)));
    return {
      members,
      onlineIds,
      count: onlineIds.size,
      isOnline: (id: string) => onlineIds.has(String(id)),
    };
  }, [members]);

  return <OnlineStatusCtx.Provider value={value}>{children}</OnlineStatusCtx.Provider>;
}

/** Reads live presence. Safe outside the provider: returns an empty, all-offline state. */
export function useOnlineStatus(): OnlineStatusValue {
  return (
    useContext(OnlineStatusCtx) ?? {
      members: [],
      onlineIds: new Set<string>(),
      count: 0,
      isOnline: () => false,
    }
  );
}
