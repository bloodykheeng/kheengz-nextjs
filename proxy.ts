import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessRoute, isDashboardRoute } from "@/lib/routeAccess";
import { AUTH_TOKEN_COOKIE, AUTH_PROFILE_COOKIE } from "@/lib/authCookies";

/**
 * Who may open which page, decided before the page renders.
 *
 * - **The dashboard** (`/dashboard/...`) needs a session, and each path must be listed in
 *   `lib/routeAccess.ts` under the role; anything unlisted goes to /not-found, so a new page is
 *   invisible until it is added there. AppSidebar filters the nav with the same list.
 * - **The sign-in pages** send someone already signed in on to the dashboard.
 * - **Everything else is the storefront**, open to everyone: buyers never sign in. A path that
 *   does not exist gets Next's own 404, never a seller's sign-in page.
 *
 * The API checks every request again with its own permissions; this only spares people a page
 * they cannot use.
 */

const AUTH_PAGES = new Set(["/login", "/forgot-password", "/sell"]);

function readRole(raw: string): string | null {
  try {
    const role = (JSON.parse(raw) as { role?: unknown })?.role;
    return typeof role === "string" && role ? role : null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(AUTH_TOKEN_COOKIE)?.value ?? "";
  const profileRaw = req.cookies.get(AUTH_PROFILE_COOKIE)?.value ?? "";
  const role = token && profileRaw ? readRole(profileRaw) : null;

  if (AUTH_PAGES.has(pathname)) {
    return role ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
  }

  if (!isDashboardRoute(pathname)) return NextResponse.next();

  if (!role) return NextResponse.redirect(new URL("/login", req.url));

  return canAccessRoute(role, pathname) ? NextResponse.next() : NextResponse.redirect(new URL("/not-found", req.url));
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
