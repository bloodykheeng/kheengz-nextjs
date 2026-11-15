"use client";

import { useEffect } from "react";

import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { ConfirmActionHost } from "@/components/dashboard/ConfirmAction";
// Single source of truth for the nav: see lib/menuItems.ts.
import { menuGroups } from "@/lib/menuItems";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, closeMobile, layoutWidth } = useSidebar();
  const { isProfileLoading } = useAuth();

  /*
   * Lock the document while the shell is mounted.
   *
   * This is an app shell: it is exactly one viewport tall and `<main>` is the
   * only thing that scrolls. The document behind it must never scroll, and it
   * was, which is what put a second scrollbar beside main's.
   *
   * The shell being `h-dvh overflow-hidden` is not enough on its own. `100vh`
   * (and `100dvh`) do not shrink when a transient horizontal scrollbar appears,
   * so the body ends up ~15px taller than the visible area and grows a vertical
   * scrollbar for it. That is why it showed on arrival and healed later: it
   * lasted exactly as long as whatever briefly overflowed sideways.
   *
   * Applied to the ELEMENTS rather than a global stylesheet, and reverted on
   * unmount, because the public pages (landing, login) are ordinary documents
   * that must keep scrolling normally.
   */
  useEffect(() => {
    const { documentElement, body } = document;

    const previous = {
      html: documentElement.style.overflow,
      body: body.style.overflow,
    };

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previous.html;
      body.style.overflow = previous.body;
    };
  }, []);

  // The loading screen covers the shell until the browser has read the session and the
  // profile has landed. The shell and the page are still rendered underneath, hidden and inert:
  // the server never reads the cookies (SessionProviders), so this is what it prerenders (and
  // isProfileLoading stays true until the browser has hydrated), and a
  // page left out of that render could not be navigated to instantly (Cache Components). It
  // also lets the page start fetching its own data while the profile loads. The server and the
  // browser's first render both show the cover, so they agree.
  const ready = !isProfileLoading;

  return (
    <>
      {!ready && <AuthLoadingScreen />}
      <div
        inert={!ready}
        aria-hidden={!ready}
        className={`flex h-dvh overflow-hidden bg-(--bg-page) ${ready ? "" : "invisible"}`}
      >
        {/* Mobile overlay */}
        {isMobileOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={closeMobile} />}

        {/* Desktop space-holder: stays at layoutWidth (70 or 260) so content
          never jumps when hover-mode temporarily widens the sidebar */}
        <div
          className="hidden shrink-0 transition-[width] duration-300 ease-in-out lg:block"
          style={{ width: layoutWidth }}
        />

        <AppSidebar groups={menuGroups} />

        {/* The header sits above every route and cannot know what a dynamic
          segment points at, so the route tells it. See BreadcrumbContext: the
          alternative was a breadcrumb reading 26 characters of ULID. */}
        <BreadcrumbProvider>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </BreadcrumbProvider>

        {/* Every "Are you sure?" in the dashboard: see ConfirmAction. */}
        <ConfirmActionHost />
      </div>
    </>
  );
}
