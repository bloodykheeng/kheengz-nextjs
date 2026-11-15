import { test, expect } from "@playwright/test";

/**
 * The storefront's front door: what a buyer sees first, how sellers find the sign-in, and the
 * rule that storefront pages never download PrimeReact's dashboard theme (app/globals.css,
 * components/auth/PrimeReactTheme.tsx).
 */
test("the home page greets buyers, points sellers to sign in, and loads no dashboard theme", async ({ page }) => {
  const themeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/themes/lara-")) themeRequests.push(request.url());
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pay on delivery.");
  await expect(page.getByText("No account, no password")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sell here? Sign in" })).toHaveAttribute("href", "/login");
  expect(themeRequests).toEqual([]);
});

test("the home page fits a phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "test-results/home-393.png", fullPage: true });
});

test("an unknown page says so and offers the way home", async ({ page }) => {
  await page.goto("/no-such-page");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
});
