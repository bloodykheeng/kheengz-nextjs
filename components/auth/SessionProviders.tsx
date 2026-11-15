"use client";

import { ThemeContext } from "@/contexts/ThemeContext";
import PrimeReactTheme from "@/components/auth/PrimeReactTheme";
import { AuthContext } from "@/contexts/AuthContext";
import OnlineStatusProvider from "@/contexts/OnlineStatusContext";
import { SidebarProvider } from "@/contexts/SidebarContext";

/**
 * Everything that depends on who is signed in: the theme, PrimeReact's theme, the session,
 * online presence and the sidebar. Mounted by the dashboard and sign-in layouts only; the
 * storefront needs none of it (buyers have no account).
 *
 * The session and the theme are read IN THE BROWSER, never on the server. With Cache
 * Components a server read of the cookies would hold every dashboard page behind the request,
 * so none could be prerendered or navigated to instantly. Nothing on these pages needs the
 * server to know the session: their data is fetched in the browser, and proxy.ts already keeps
 * signed-out visitors away. The server sends the loading screen; the browser fills in the rest.
 */
export default function SessionProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext>
      <PrimeReactTheme />
      <AuthContext>
        <OnlineStatusProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </OnlineStatusProvider>
      </AuthContext>
    </ThemeContext>
  );
}
