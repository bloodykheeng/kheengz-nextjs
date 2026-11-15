import { test, expect, type Page } from "@playwright/test";

/**
 * Moving between pages inside the app renders layouts in the browser, which a full page load
 * does not: React reports problems there (a <script> in a layout, a hydration mismatch) that a
 * plain reload never shows. This walks the storefront, sign-in and dashboard by clicking.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@kheengz.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "Kheengz@2026";

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  return problems;
}

test("clicking from the storefront to sign-in, into the dashboard and back raises no console problems", async ({ page }) => {
  const problems = collectConsoleProblems(page);

  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);

  await page.getByRole("navigation").getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

  await page.getByRole("link", { name: "Go to the home page" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pay on delivery.");

  expect(problems).toEqual([]);
});

test("a dark-mode viewer gets the dark theme before React loads, and the storefront stays light", async ({ page, context, baseURL }) => {
  const host = new URL(baseURL ?? "http://localhost:3000").hostname;
  await context.addCookies([{ name: "kheengz_theme", value: "dark", domain: host, path: "/" }]);
  await page.addInitScript(() => {
    // Records whether <html> was dark at the first moment the page could paint.
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { darkAtLoad: boolean }).darkAtLoad = document.documentElement.classList.contains("dark");
    });
  });

  const problems = collectConsoleProblems(page);
  await page.goto("/login");
  expect(await page.evaluate(() => (window as unknown as { darkAtLoad: boolean }).darkAtLoad)).toBe(true);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  expect(problems).toEqual([]);

  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
