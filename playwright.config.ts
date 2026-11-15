import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks in a real Chromium against the running app (Next's recommended E2E tool:
 * node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md). See docs/e2e-testing.md.
 *
 * Start the API (`composer dev`) and the web app (`npm run dev`) first; the suite does not
 * start them, so it can also be pointed at staging with E2E_BASE_URL / E2E_API_URL.
 */
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: "./e2e",
  // Deletes the throwaway accounts the specs made (e2e/global-teardown.ts).
  globalTeardown: "./e2e/global-teardown.ts",
  // A route's first visit in `next dev` compiles it, which can take a minute or more.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
    },
    {
      // Pages anyone opens without signing in: the storefront, sign-in itself.
      name: "buyer",
      testMatch: /buyer\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
