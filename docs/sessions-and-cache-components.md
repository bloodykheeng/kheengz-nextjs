# Sessions, Cache Components and the static shell

Next 16.4's `create-next-app` turns on **Cache Components** (`cacheComponents: true` in
[next.config.ts](../next.config.ts)), and we keep it: every page is prerendered into a static
shell that opens at once, which matters most on a buyer's phone on mobile data. It changes how a
page may read the request, and that decided how the session works here. Bundled guides:
`node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` and
`instant-navigation.md`.

## The rule

With Cache Components, anything that reads the request (cookies, headers) must sit behind a
`<Suspense>` boundary, and **a page left out of the prerendered shell cannot be navigated to
instantly**: in development Next reports it as "Could not validate that a segment in your UI has
instant navigation ... dropped segment".

## What we do

**The server never reads the session.** GiftNest read the sign-in cookies in its root layout so
the first paint knew the user. Here that would make every page dynamic, the storefront too, and
reading them in the dashboard layout instead holds every dashboard page behind the request (the
"dropped segment" above). Nothing on those pages needs the server to know the user: their data is
fetched in the browser by TanStack Query, and [proxy.ts](../proxy.ts) keeps signed-out visitors away
before any page renders. So:

| Piece | Where |
| --- | --- |
| Who may open which page | [proxy.ts](../proxy.ts), from the cookies, before render. Only `/dashboard/...` needs a session; every other path is the storefront, open to all (`isDashboardRoute`, [lib/routeAccess.ts](../lib/routeAccess.ts)) |
| The session (token, profile, permissions) | [contexts/AuthContext.tsx](../contexts/AuthContext.tsx), in the browser. `isProfileLoading` stays true until the browser has hydrated, so the server and the first browser render agree |
| The theme | [contexts/ThemeContext.tsx](../contexts/ThemeContext.tsx), the cookie read through `useSyncExternalStore` (light on the server). [lib/themeBoot.ts](../lib/themeBoot.ts), an inline script in the **root layout's** `<head>`, puts the dark class on before the first paint on dashboard and sign-in pages only, so there is no light flash |
| The providers | [components/auth/SessionProviders.tsx](../components/auth/SessionProviders.tsx), a client component mounted by the dashboard and sign-in layouts only |
| The shell | [DashboardLayout.tsx](../components/dashboard/layout/DashboardLayout.tsx) always renders the sidebar, header and page, hidden and `inert` under [AuthLoadingScreen](../components/auth/AuthLoadingScreen.tsx) until the profile lands. The page is therefore in the prerendered shell, and starts fetching its own data while the profile loads |

| URL reads | Never in the shell during render. The sidebar's highlight and the breadcrumb read `usePathname()` inside their own `<Suspense>`; the router is [useAppRouter](../hooks/useAppRouter.ts) (no `nextjs-toploader/app`, which reads the pathname); contexts and [lib/handleApiError.ts](../lib/handleApiError.ts) read `window.location` when they need it. A dynamic page reads `useParams()` inside `<Suspense>` in its page file |

`next build` shows every route as `○ (Static)`, and pages with an id in the address
(`/dashboard/shops/[id]`, `/dashboard/vendors/[id]`) as `◐ (Partial Prerender)`: the shell is static,
the record's body fills in. If the build reports "usePathname() ... outside of `<Suspense>`", a URL
read has crept into the shell.

## PrimeReact only where it is used

Dashboards use PrimeReact; storefront pages never do (CLAUDE.md). Its lara theme (~250 KB) is not
linked from the root layout as GiftNest did. [PrimeReactTheme.tsx](../components/auth/PrimeReactTheme.tsx),
inside SessionProviders, imports the light or dark theme into a **cascade layer**:

```css
/* app/globals.css, before Tailwind */
@layer theme, base, primereact, components, utilities;
```

So the theme sits above Tailwind's preflight (PrimeReact's buttons keep their look) and below
Tailwind's utilities and every unlayered rule in `globals.css` and `primereact-theme.css`, wherever
it lands in the page. The storefront downloads none of it (`e2e/buyer/home.spec.ts` checks).

## The theme script

Three things were tried; one works.

- **Inline `<script>` in the dashboard or sign-in layout:** React refuses to run a `<script>` it
  creates in the browser, and those layouts are created in the browser whenever someone clicks
  their way in ("Encountered a script tag while rendering React component").
- **`next/script` with `beforeInteractive`:** queued by Next's runtime and run after the HTML is
  parsed, too late to stop the flash.
- **Inline `<script>` in the root layout's `<head>`** (what we do): runs while the HTML is parsed,
  and the root layout is drawn once by the server and never again in the browser. It changes
  `<html>` before React hydrates, so `<html>` carries `suppressHydrationWarning`, React's documented
  exception for this; it covers that element's own attributes only.

`e2e/buyer/navigation.spec.ts` clicks storefront, sign-in, dashboard and back with the console
watched, and checks a dark-mode hard load is dark at first paint with a silent console.

## Things that read the browser

Rendering anything from the clock, a cookie or localStorage on the server gives a different answer
than the browser, and React reports a hydration mismatch. Read them with `useSyncExternalStore` and a
server snapshot: [hooks/useHydrated.ts](../hooks/useHydrated.ts), [hooks/useTimeGreeting.ts](../hooks/useTimeGreeting.ts)
("Welcome" on the server, "Good evening" in the browser), [lib/rememberedAccount.ts](../lib/rememberedAccount.ts).

## Checking it

- `next build`: every route `○` or `◐`, no build errors about uncached data or URL data.
- Open each changed screen in development with the console showing: no instant-navigation errors and
  no hydration errors. The e2e suite covers the flows ([e2e-testing.md](e2e-testing.md)).
- Empty `NEXT_PUBLIC_*` values count as unset (`||`, not `??`): `.env.production` keeps them blank
  until the domain exists.
