import { test, type Page } from "@playwright/test";

/**
 * The screenshot runner (coding-notes ai-agents/look-at-your-own-screens.md): opens the main dashboard screens as
 * the seeded Admin at the two desk sizes the notes name (1536x745, a 1920 laptop at 125%, and 1920x1080), in light
 * and dark, and saves a picture of each to test-results/screens/ (git-ignored) for a person or an agent to LOOK at
 * before saying a screen is done. It asserts nothing beyond the page opening.
 *
 * Opt-in, so the normal suite stays quick:  SCREENS=1 npx playwright test e2e/admin/screens.spec.ts
 */
test.skip(!process.env.SCREENS, "Set SCREENS=1 to take the pictures.");
test.setTimeout(240_000);

const SIZES = [
  { name: "1536", width: 1536, height: 745 },
  { name: "1920", width: 1920, height: 1080 },
];

const SCREENS: [string, string, string][] = [
  ["01-dashboard", "/dashboard", "Good"],
  ["10-vendors", "/dashboard/vendors", "Vendors"],
  ["11-shops", "/dashboard/shops", "Shops"],
  ["20-categories", "/dashboard/catalogue/categories", "Basins"],
  ["21-attributes", "/dashboard/catalogue/attributes", "Capacity"],
  ["22-units", "/dashboard/catalogue/units", "dozen"],
  ["23-requests", "/dashboard/catalogue/requests", "Category requests"],
  ["30-users", "/dashboard/users", "admin@kheengz.com"],
  ["31-audit-trail", "/dashboard/audit-trail", "Audit trail"],
  ["32-platform-settings", "/dashboard/platform-settings", "Platform settings"],
];

/** The theme lives in the `kheengz_theme` cookie (lib/themeBoot.ts), read before the first paint. */
async function setTheme(page: Page, theme: "light" | "dark", baseURL: string) {
  await page.context().addCookies([{ name: "kheengz_theme", value: theme, domain: new URL(baseURL).hostname, path: "/" }]);
}

for (const theme of ["light", "dark"] as const) {
  for (const size of SIZES) {
    test(`main screens, ${theme}, ${size.name}`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await setTheme(page, theme, baseURL ?? "http://localhost:3000");
      for (const [name, path, wait] of SCREENS) {
        await page.goto(path);
        await page.getByText(wait).first().waitFor({ timeout: 60_000 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `test-results/screens/${theme}-${size.name}-${name}.png` });
      }
    });
  }
}
