"use client";

import { LogoMark } from "@/components/brand/Logo";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { MdClose } from "react-icons/md";
import SidebarItem from "./SidebarItem";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/contexts/OnlineStatusContext";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessRoute } from "@/lib/routeAccess";
import { APP_NAME } from "@/lib/brand";
import type { NavGroup, NavItem } from "@/types/navigation";

interface AppSidebarProps {
  groups: NavGroup[];
}

export default function AppSidebar({ groups }: AppSidebarProps) {
  const pathname = usePathname();
  const {
    isMobileOpen,
    isExpanded,
    visualWidth,
    sidebarState,
    closeMobile,
    setHovering,
  } = useSidebar();

  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { can } = usePermissions();

  const userName = user?.name || "Account";
  const userEmail = user?.email ?? user?.phone ?? "";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  const selfOnline = user?.id ? isOnline(String(user.id)) : false;

  const role = user?.role ?? "";

  // Two gates, both required. `canAccessRoute` reads the same list proxy.ts
  // enforces, so nothing here can link to a page that redirects to /not-found;
  // `permission` then hides what the role may not read. A parent keeps only its
  // surviving children and disappears with the last of them, and a group with
  // nothing left takes its heading and divider with it. Live counts ("3 new
  // orders") come back with the orders module, from one counts-only call.

  const visibleGroups = useMemo(() => {
    const keep = (item: NavItem): NavItem | null => {
      if (item.children?.length) {
        const children = item.children.map(keep).filter(Boolean) as NavItem[];
        return children.length ? { ...item, children } : null;
      }
      if (item.href && !canAccessRoute(role, item.href)) return null;
      if (item.permission && !can(item.permission)) return null;
      return item;
    };

    return groups
      .map((group) => ({
        ...group,
        items: group.items.map(keep).filter(Boolean) as NavItem[],
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, role, can]);

  return (
    <aside
      style={{ "--sidebar-w": `${visualWidth}px` } as React.CSSProperties}
      className={[
        "fixed left-0 top-0 z-30 flex h-full flex-col",
        "w-65 lg:w-(--sidebar-w)",
        "overflow-hidden border-r border-(--border-color) bg-(--bg-sidebar)",
        "transition-[width,transform] duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* The brand is a link, a masthead that does nothing when clicked being
          the first thing every reader tries. It goes to `/`, the storefront;
          the dashboard has its own entry in the menu below. */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-(--border-color) ${
          isExpanded ? "gap-3 px-4" : "justify-center px-3"
        }`}
      >
        <Link
          href="/"
          onClick={closeMobile}
          aria-label="Go to the home page"
          title="Go to the home page"
          className={`flex min-w-0 cursor-pointer items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand) ${
            isExpanded ? "flex-1 gap-3" : ""
          }`}
        >
          <LogoMark className="h-9 w-9 shrink-0" />

          {isExpanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-(--text-primary)">
                {APP_NAME}
              </p>
              <p className="truncate text-[10px] leading-tight text-(--text-muted)">
                Dashboard
              </p>
            </div>
          )}
        </Link>

        {isExpanded && (
          <>
            <button
              onClick={closeMobile}
              aria-label="Close sidebar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-(--text-muted) transition-colors hover:text-(--text-primary) lg:hidden"
            >
              <MdClose className="text-xl" />
            </button>
          </>
        )}
      </div>

      {/* State badge (desktop, collapsed only) */}
      {!isExpanded && (
        <div className="hidden justify-center pt-2 lg:flex">
          <span className="rounded text-[9px] font-bold uppercase tracking-widest text-(--text-muted)">
            {sidebarState === "hover" ? "HVR" : "DCK"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* A heading never repeats the entry under it ("SETTINGS" over
            "Settings"); see lib/menuItems.ts. The divider is for the collapsed
            rail, where the entries are icons with no labels and the heading
            cannot be drawn. */}
        {visibleGroups.map((group, idx) => (
          <div key={group.id} className={idx > 0 ? "mt-4" : ""}>
            {group.label && isExpanded && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-(--text-muted) uppercase">
                {group.label}
              </p>
            )}
            {!isExpanded && idx > 0 && (
              <hr className="my-2 border-(--border-color)" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <SidebarItem item={item} depth={0} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        className={`shrink-0 border-t border-(--border-color) p-3 ${
          isExpanded ? "" : "flex justify-center"
        }`}
      >
        {isExpanded ? (
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
                {initials}
              </div>
              {/* Own presence, straight off the Reverb `online` channel: a quick
                  way to see the socket is actually connected. */}
              <span
                title={selfOnline ? "Connected" : "Offline"}
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--bg-sidebar) ${
                  selfOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text-primary)">
                {userName}
              </p>
              <p className="truncate text-xs text-(--text-muted)">
                {userEmail}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
              {initials}
            </div>
            <span
              title={selfOnline ? "Connected" : "Offline"}
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-(--bg-sidebar) ${
                selfOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
