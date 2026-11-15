"use client";

import Link from "next/link";
import { useState } from "react";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { renderIcon } from "@/lib/iconRegistry";
import { useSidebar } from "@/contexts/SidebarContext";
import type { NavItem } from "@/types/navigation";
import { useResetWhen } from "@/hooks/useResetOnOpen";

function isActiveItem(item: NavItem, pathname: string): boolean {
  if (item.href) {
    // Prefix matching is what keeps a parent lit on its own sub-pages, but it
    // also lit `/dashboard` on every single dashboard route, since every one of
    // them starts with it. `exact` opts an item out. See types/navigation.ts.
    if (item.exact) return pathname === item.href;

    return pathname === item.href || pathname.startsWith(item.href + "/");
  }
  return item.children?.some((c) => isActiveItem(c, pathname)) ?? false;
}

interface SidebarItemProps {
  item: NavItem;
  depth: number;
  pathname: string;
}

export default function SidebarItem({ item, depth, pathname }: SidebarItemProps) {
  const { isExpanded, closeMobile } = useSidebar();
  const isCollapsed = !isExpanded;
  const isRoot = depth === 0;

  const active = isActiveItem(item, pathname);
  const hasChildren = !!item.children?.length;
  const [expanded, setExpanded] = useState(active && hasChildren);

  // Opens the group holding the page just navigated to, before the paint.
  useResetWhen(`${pathname}|${active}|${hasChildren}`, () => {
    if (active && hasChildren) setExpanded(true);
  });

  const itemCls = [
    "group relative flex w-full items-center rounded-lg py-2 text-left text-sm font-medium transition-colors duration-150",
    isCollapsed && isRoot ? "justify-center px-2" : "gap-3 px-3",
    active
      ? "bg-(--sidebar-active-bg) text-(--sidebar-active-text)"
      : "text-(--text-secondary) hover:bg-(--sidebar-hover-bg) hover:text-(--text-primary)",
  ].join(" ");

  const badge = !isCollapsed && item.badge != null && (
    <span
      className={[
        "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        item.badgeVariant === "danger" ? "bg-red-100 text-red-600"
          : item.badgeVariant === "warning" ? "bg-amber-100 text-amber-700"
            : item.badgeVariant === "success" ? "bg-green-100 text-green-700"
              : "bg-(--rose) text-(--brand-dark)",
      ].join(" ")}
    >
      {item.badge}
    </span>
  );

  // `renderIcon` hands back an element, never a component type. Writing
  // `<Icon />` from a registry lookup makes React treat the type as new on every
  // render and remount the subtree; see lib/iconRegistry.tsx.
  const iconEl = isRoot ? (
    renderIcon(
      item.iconName,
      `shrink-0 text-[1.1rem] ${active ? "text-(--sidebar-active-text)" : "text-(--text-muted)"
      }`
    ) ?? <span className="h-4.5 w-4.5 shrink-0 rounded bg-(--border-color)" />
  ) : (
    <span
      className={`ml-4 h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-(--sidebar-active-text)" : "bg-(--text-muted)"
        }`}
    />
  );

  const tooltip = isCollapsed && isRoot && (
    <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {item.label}
    </span>
  );

  const activeBar = active && isRoot && (
    <span className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full bg-(--sidebar-active-text)" />
  );

  const inner = (
    <>
      {activeBar}
      {iconEl}
      {(!isCollapsed || !isRoot) && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {badge}
      {!isCollapsed && hasChildren && (
        <span className="ml-auto shrink-0 text-base text-(--text-muted)">
          {expanded ? <MdExpandLess /> : <MdExpandMore />}
        </span>
      )}
      {tooltip}
    </>
  );

  if (hasChildren) {
    return (
      <div>
        <button className={itemCls} onClick={() => setExpanded((v) => !v)}>
          {inner}
        </button>
        {!isCollapsed && expanded && (
          <div className="ml-3 mt-0.5 border-l border-(--border-color) pl-1">
            {item.children!.map((child) => (
              <SidebarItem key={child.id} item={child} depth={depth + 1} pathname={pathname} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href!} className={itemCls} onClick={closeMobile}>
      {inner}
    </Link>
  );
}
