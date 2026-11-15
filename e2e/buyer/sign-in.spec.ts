import { test, expect } from "@playwright/test";

/**
 * Signing in through the real form against the local API, with the seeded Admin
 * (kheengz-laravel UsersTableSeeder). The dashboard is closed to anyone not signed in.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@kheengz.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "Kheengz@2026";

test("the dashboard sends someone not signed in to the sign-in page", async ({ page }) => {
  await page.goto("/dashboard/users");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password is refused in words, on the form", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.locator('input[type="password"]').fill("not-the-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("the seeded Admin signs in and lands on the dashboard with the admin menu", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
});
