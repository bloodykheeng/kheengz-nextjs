# Testing the screens in a real browser (Playwright)

The suite drives a real Chromium against the running app and the local API, the way Next's guide
recommends (`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`). Copied from
GiftNest's setup and pointed at Kheengz.

## Run it

1. Start the API and the web app: `php artisan serve` (with `queue:work` for the audit trail) in
   `kheengz-laravel`, `npm run dev` here. The suite does not start them.
2. Then:

```bash
npx playwright test                              # everything
npx playwright test e2e/admin/dashboard.spec.ts  # one file
npx playwright test --ui                         # watch it run
```

Point it elsewhere with `E2E_BASE_URL` (the web app) and `E2E_API_URL` (the API, up to `/api`).
Accounts default to the seeded Admin (`admin@kheengz.com` / `Kheengz@2026`); override with
`E2E_ADMIN_EMAIL` and `E2E_PASSWORD`. If Playwright was just updated, `npx playwright install chromium` first.

## How it is laid out

| File | What it does |
| --- | --- |
| [playwright.config.ts](../playwright.config.ts) | One worker, the projects below, traces and screenshots kept on failure |
| [e2e/auth.setup.ts](../e2e/auth.setup.ts) | Signs each account in through `POST /v1/auth/login` once and saves the session as the app keeps it: the cookies named in [lib/authCookies.ts](../lib/authCookies.ts) (the token, and the URI-encoded profile `{id,name,role,email}`) |
| `e2e/admin/*.spec.ts` | Run signed in as the seeded Admin |
| `e2e/buyer/*.spec.ts` | No session: the storefront and the sign-in page itself |
| [e2e/global-teardown.ts](../e2e/global-teardown.ts) | `php artisan e2e:cleanup` after the run (removes `e2e-…@example.com` accounts; refuses in production) |

`e2e/.auth/`, `test-results/` and `playwright-report/` are git-ignored: the saved sessions hold real tokens.

## What is covered

| Spec | Checks |
| --- | --- |
| `buyer/home.spec.ts` | The home page greets buyers and links sellers to sign in; it downloads no PrimeReact theme (storefront pages never do); it fits 393 px with no sideways scroll; an unknown path shows Page not found, not a sign-in page |
| `buyer/navigation.spec.ts` | Clicking storefront, sign-in, dashboard and back raises no console error or warning (layouts drawn in the browser show problems a reload hides); a dark-mode viewer is dark at first paint with a silent console, and the storefront stays light |
| `buyer/sign-in.spec.ts` | A signed-out visit to the dashboard goes to sign-in; a wrong password is refused on the form; the seeded Admin signs in through the form and lands on the dashboard with the admin menu |
| `admin/dashboard.spec.ts` | The dashboard's shortcuts; Users lists the seeded Admin; Roles shows Admin, Staff and Vendor; the audit trail shows sign-ins, a Where column and the DB-IP credit; Queues opens; dark mode switches and survives a reload |

## Writing a spec

- Find things the way a person does: `getByRole`, `getByText`, `getByPlaceholder`. A test that needs a
  CSS class is testing the wrong thing.
- A spec that changes data makes its own and cleans it up (or uses an `e2e-…@example.com` account
  that the teardown removes).
- Buyer pages are checked at **393 x 852** as well as desktop: most buyers are on a phone.
- Each Phase 1 module adds its specs here and a row to the table above.

## Before a change is done

Besides the specs, open the changed screens with the browser console showing, by a full load AND by
clicking into them from another page: Next's instant-navigation checks and React's hydration and
script checks report there in development, some only on one of the two, and all must be silent. See [sessions-and-cache-components.md](sessions-and-cache-components.md).
