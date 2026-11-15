import { test, expect } from "@playwright/test";

/** The Admin's foundation screens open and show real data from the local API. */
test("the dashboard offers the Admin's shortcuts", async ({ page }) => {
  await page.goto("/dashboard");

  for (const name of ["Users", "Roles & permissions", "Queues", "Audit trail"]) {
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await expect(page.getByText("No sales yet")).toBeVisible();
});

test("Users lists the seeded Admin", async ({ page }) => {
  await page.goto("/dashboard/users");

  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /admin@kheengz\.com/ })).toBeVisible();
});

test("Roles & permissions shows Admin, Staff and Vendor", async ({ page }) => {
  await page.goto("/dashboard/roles");

  for (const role of ["Admin", "Staff", "Vendor"]) {
    await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
  }
});

test("the audit trail shows sign-ins, where they came from, and credits DB-IP", async ({ page }) => {
  await page.goto("/dashboard/audit-trail");

  await expect(page.getByText(/logged in/).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Where" })).toBeVisible();
  await expect(page.getByRole("link", { name: "IP Geolocation by DB-IP" })).toHaveAttribute("href", "https://db-ip.com");
});

test("Queues opens on the waiting jobs", async ({ page }) => {
  await page.goto("/dashboard/queues");
  await expect(page.getByRole("heading", { name: /Queues/ })).toBeVisible();
});

test("dark mode switches the dashboard and stays after a reload", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /dark|theme/i }).first().click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/dashboard-dark.png" });

  // Back to light for the next run.
  await page.getByRole("button", { name: /light|theme/i }).first().click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
