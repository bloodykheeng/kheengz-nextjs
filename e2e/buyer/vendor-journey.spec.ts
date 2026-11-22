import { test, expect, type Page } from "@playwright/test";
import { freshNin, verificationCodeFor } from "../helpers/laravel";
import { solidPng } from "../helpers/png";

/**
 * A seller's whole way in (D31, D35), through the real screens and the local API: apply on /sell,
 * confirm the email code, upload both ID sides, add a Mobile Money number in their own name, open a
 * shop, choose where it is paid and send it for review. Then the Admin approves the vendor and the
 * shop, and the shop is Active. The seller lists a product with options and a photo and puts it on
 * sale, asking for a missing category on the way; the Admin adds the category and takes the product down. The throwaway e2e-… account and its vendor go at teardown.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@kheengz.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "Kheengz@2026";
const stamp = `${Date.now()}`.slice(-7);
const SELLER = { name: "Aisha Nakato", email: `e2e-seller-${stamp}@example.com`, phone: `07720${stamp.slice(-5)}0`.slice(0, 10) };
const SHOP = { name: `E2E Basins ${stamp}`, slug: `e2e-basins-${stamp}` };
const PRODUCT = `Round Basin ${stamp}`;
const REQUESTED = `Water filters ${stamp}`;

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function uploadPaper(page: Page, label: string) {
  const row = page.getByRole("listitem").filter({ hasText: label });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), row.getByRole("button", { name: "Upload" }).click()]);
  await chooser.setFiles({ name: "id.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex") });
  await expect(row.getByRole("button", { name: "Replace" })).toBeVisible();
}

test("a seller applies, sets up a shop and sends it for review", async ({ page }) => {
  await page.goto("/sell");
  await page.getByLabel("Full name").fill(SELLER.name);
  await page.getByLabel("Email").fill(SELLER.email);
  await page.getByLabel("Phone").fill(SELLER.phone);
  await page.getByLabel("Password", { exact: true }).fill("Basins2026");
  await page.getByLabel("Password again").fill("Basins2026");
  await page.getByLabel("Business name").fill(SELLER.name);
  await page.getByLabel("National ID Number (NIN)").fill(freshNin());
  await page.getByText(/I agree to the Seller Terms/).click();
  await page.getByRole("button", { name: "Apply to sell" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByPlaceholder("000000").fill(verificationCodeFor(SELLER.email));
  await page.getByRole("button", { name: /confirm|verify/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/vendor$/);
  await expect(page.getByText(/Before we can check your business, add/)).toBeVisible();

  await uploadPaper(page, "National ID (front)");
  await uploadPaper(page, "National ID (back)");
  await expect(page.getByText("Complete")).toBeVisible();

  await page.getByRole("button", { name: "Add" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add a payout destination" });
  await dialog.getByLabel("Mobile Money number").fill(SELLER.phone);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/MTN Mobile Money/).first()).toBeVisible();
  await expect(page.getByText("Verified").first()).toBeVisible();

  await page.getByRole("button", { name: "Open a shop" }).first().click();
  const shopDialog = page.getByRole("dialog", { name: "Open a shop" });
  await shopDialog.getByLabel("Shop name").fill(SHOP.name);
  await shopDialog.getByLabel("Web address").fill(SHOP.slug);
  await shopDialog.locator(".p-dropdown").filter({ hasText: "Choose a type" }).click();
  await page.getByRole("option", { name: "Household & home" }).click();
  await shopDialog.getByLabel(/^Address/).fill("Plot 12, Kikuubo Lane");
  await shopDialog.getByLabel("Area").fill("Kikuubo");
  await shopDialog.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(/\/dashboard\/shops\/[0-9a-z]{26}$/);
  await expect(page.getByRole("heading", { name: new RegExp(SHOP.name) })).toBeVisible();

  await page.locator(".p-dropdown").filter({ hasText: "Choose where it is paid" }).click();
  await page.getByRole("option", { name: /MTN Mobile Money/ }).click();
  const paidCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Where it is paid" }) });
  await expect(paidCard.locator("p").filter({ hasText: /MTN Mobile Money/ })).toBeVisible();

  await page.getByRole("button", { name: "Send for review" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Pending review").first()).toBeVisible();
});

test("the Admin approves the vendor, then the shop, and the shop opens", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, PASSWORD);

  await page.goto(`/dashboard/vendors?search=${encodeURIComponent(SELLER.name)}&status=Pending`);
  await page.getByRole("link", { name: new RegExp(SELLER.name) }).first().click();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();

  await page.getByRole("link", { name: new RegExp(SHOP.name) }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(SHOP.name) }).getByText("Active")).toBeVisible();
  await expect(page.getByText("Approved").first()).toBeVisible();
});

test("the seller lists a product with options, asks for a category, and puts it on sale", async ({ page }) => {
  await signIn(page, SELLER.email, "Basins2026");
  await page.goto("/dashboard/shops");
  await page.getByRole("link", { name: new RegExp(SHOP.name) }).first().click();
  await page.getByRole("link", { name: "Products" }).click();
  await expect(page.getByText("No products yet. Add your first one.")).toBeVisible();

  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel(/^Name/).fill(PRODUCT);
  await page.locator(".p-dropdown").filter({ hasText: "Choose a category" }).click();
  await page.getByPlaceholder("Type to search, like basins").fill("basins");
  await page.getByRole("option", { name: "Basins" }).click();
  await expect(page.getByText("Details buyers filter by")).toBeVisible();
  await page.getByLabel(/^Capacity/).pressSequentially("20");

  // Ask for a category the tree lacks, from the same form.
  await page.getByRole("button", { name: "No category fits? Ask for one." }).click();
  const ask = page.getByRole("dialog", { name: "Ask for a category" });
  await ask.getByLabel(/^Name/).fill(REQUESTED);
  await ask.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/We will tell you when/)).toBeVisible();

  await page.getByRole("button", { name: "Add options" }).click();
  await page.getByLabel("Values").fill("Red");
  await page.getByLabel("Values").press("Enter");
  await page.getByLabel("Values").fill("Blue");
  await page.getByLabel("Values").press("Enter");
  await expect(page.getByText("2 variants")).toBeVisible();
  await page.getByLabel("One price for all variants").pressSequentially("6000");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(/\/dashboard\/products\/[0-9a-z]{26}$/);
  await expect(page.getByRole("heading", { name: new RegExp(PRODUCT) })).toBeVisible();

  // Not without a photo.
  await page.getByRole("button", { name: "Put on sale" }).click();
  await expect(page.getByText(/Add at least one photo: buyers do not buy/)).toBeVisible();

  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Upload photos" }).click()]);
  await chooser.setFiles({ name: "basin.png", mimeType: "image/png", buffer: solidPng() });
  await expect(page.getByText("Cover")).toBeVisible();

  await page.getByRole("button", { name: "Put on sale" }).click();
  await expect(page.getByText("On sale: buyers can find it.")).toBeVisible();
});

test("the Admin answers the request and takes a product down", async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, PASSWORD);

  await page.goto("/dashboard/catalogue/requests");
  const row = page.getByRole("row").filter({ hasText: REQUESTED });
  await row.getByRole("button", { name: "Add it" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add and tell the shop" }).click();
  await expect(page.getByText("Added. We told the shop.")).toBeVisible();

  await page.goto("/dashboard/shops");
  await page.getByRole("link", { name: new RegExp(SHOP.name) }).first().click();
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: new RegExp(PRODUCT) }).click();
  await page.getByRole("button", { name: "Take down" }).click();
  await page.getByRole("dialog").getByLabel(/^Reason/).fill("The photo does not show the product.");
  await page.getByRole("dialog").getByRole("button", { name: "Take down" }).click();
  await expect(page.getByText(/Kheengz took this product down: The photo does not show the product./)).toBeVisible();
});
