# kheengz-nextjs

The Kheengz web app: the storefront buyers use (no account, Buy now or cart, pay on delivery) and the
dashboards for the platform's Admins and Staff and for vendors. Next.js 16 (App Router, Cache
Components), React 19, TanStack Query, react-hook-form + zod, Tailwind 4; PrimeReact 10 on dashboards
only. The API is [kheengz-laravel](https://github.com/bloodykheeng/kheengz-laravel).

Workspace instructions, plan and decisions: `../CLAUDE.md`, `../WORK-PLAN.md`, `../docs/decisions.md`.
How this app does things: [docs/](docs/README.md).

## Run it

```bash
npm install
# .env.development is not in git: copy it from ../../deployment/server-env/ or rebuild it from .env.example
npm run dev            # http://localhost:3000
```

The API must be running (`php artisan serve`, `queue:work`, `reverb:start` in kheengz-laravel). Sign in
at `/login` with the seeded Admin, `admin@kheengz.com` / `Kheengz@2026`.

## Check it

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint app components lib services hooks contexts e2e types utils proxy.ts
npx next build          # every route should be ○ (Static)
npx playwright test     # with both apps running: docs/e2e-testing.md
```

ESLint runs Next's full rule set with nothing switched off.

## Where things are

| Folder | What |
| --- | --- |
| `app/` | Routes: `/` (storefront), `(auth)/` (sign-in, reset, sell), `dashboard/` (vendor, shops with their products and stock, products, vendors, catalogue, platform settings, admin pages) |
| `components/` | `auth/` (session providers, sign-in pieces), `brand/`, `common/`, `dashboard/` (layout, table, filters, export, forms, vendor cards, catalogue: product form, photos, category picker) |
| `contexts/`, `hooks/`, `lib/` | Session, theme, sidebar; list params, resets, permissions; route access, formatting, API errors |
| `services/` | One file per API area, typed to the Laravel resources (`services/types/`) |
| `e2e/` | Playwright specs and helpers |
| `proxy.ts` | Page access before render (Next 16's name for middleware) |
