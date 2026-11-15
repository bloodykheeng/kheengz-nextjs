import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { AUTH_PROFILE_COOKIE, AUTH_TOKEN_COOKIE } from "../lib/authCookies";

/**
 * Signs each test account in through the API once and saves the session the way the app keeps
 * it (lib/authCookies.ts): the token cookie and the slim profile cookie. Specs then start signed
 * in. Seeded accounts (kheengz-laravel UsersTableSeeder); override with env vars.
 */
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000/api";
const BASE = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000");
const PASSWORD = process.env.E2E_PASSWORD ?? "Kheengz@2026";

const ACCOUNTS = {
  admin: process.env.E2E_ADMIN_EMAIL ?? "admin@kheengz.com",
};

for (const [who, email] of Object.entries(ACCOUNTS)) {
  setup(`sign in as ${who}`, async ({ request, browser }) => {
    const response = await request.post(`${API}/v1/auth/login`, {
      data: { email, password: PASSWORD, device_name: "e2e" },
      headers: { Accept: "application/json" },
    });
    expect(response.ok(), `login for ${email} answered ${response.status()}`).toBeTruthy();
    const body = await response.json();
    // The API answers { token, user: UserResource }.
    const user = body.user;
    const profile = { id: user.id, name: user.name, role: user.role, email: user.email ?? email };

    const context = await browser.newContext();
    const cookie = { domain: BASE.hostname, path: "/", sameSite: "Lax" as const };
    await context.addCookies([
      { ...cookie, name: AUTH_TOKEN_COOKIE, value: body.token },
      // js-cookie stores values URI-encoded.
      { ...cookie, name: AUTH_PROFILE_COOKIE, value: encodeURIComponent(JSON.stringify(profile)) },
    ]);
    mkdirSync("e2e/.auth", { recursive: true });
    await context.storageState({ path: `e2e/.auth/${who}.json` });
    await context.close();
  });
}
