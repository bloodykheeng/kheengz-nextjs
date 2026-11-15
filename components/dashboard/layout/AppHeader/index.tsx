"use client";

import { MdMenu, MdMenuOpen } from "react-icons/md";
import Breadcrumb from "./Breadcrumb";
import ThemeToggle from "../../../common/ThemeToggle";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import { useSidebar } from "@/contexts/SidebarContext";

// The bell and the user menu read the signed-in account themselves (AuthContext, the
// notifications API), so the header has nothing to hand them.
export default function AppHeader() {
  const { sidebarState, cycleSidebarState, isExpanded, toggleMobile } =
    useSidebar();

  const stateLabel =
    sidebarState === "expanded"
      ? "Dock sidebar"
      : sidebarState === "docked"
        ? "Hover mode"
        : "Expand sidebar";

  /*
   * `relative z-1001`: a stacking context above page content that sets its own z-indexes
   * (a map's panes reach 1000, as Leaflet's do), so the bell's panel never drops under them.
   * PrimeReact's dialogs start at 1100 and cover both.
   */
  return (
    <header className="relative z-1001 flex h-16 shrink-0 items-center gap-2 border-b border-(--border-color) bg-(--bg-nav) px-4">
      {/* Mobile: toggle drawer */}
      <button
        onClick={toggleMobile}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg) lg:hidden"
      >
        <MdMenu className="text-xl" />
      </button>

      {/* Desktop: cycle expanded, docked, hover */}
      <button
        onClick={cycleSidebarState}
        aria-label={stateLabel}
        title={stateLabel}
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg) lg:flex"
      >
        {isExpanded ? (
          <MdMenu className="text-xl" />
        ) : (
          <MdMenuOpen className="text-xl" />
        )}
      </button>

      {/* Breadcrumb */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <Breadcrumb />
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />

        <div className="mx-1 h-6 w-px bg-(--border-color)" />

        <UserMenu />
      </div>
    </header>
  );
}
