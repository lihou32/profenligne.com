import { test, expect } from "@playwright/test";

test.describe("critical journeys", () => {
  test("auth pages are reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /inscription/i })).toBeVisible();
    await expect(page.getByPlaceholder("votre@email.com")).toBeVisible();
  });

  test("booking journey entry points are visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();

    await page.goto("/tutors/non-existent");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
  });

  test("payment success and cancel pages render expected actions", async ({ page }) => {
    await page.goto("/payment/success?credits=120");
    await expect(page.getByRole("heading", { name: /paiement réussi/i })).toBeVisible();
    await expect(page.getByText("+120")).toBeVisible();
    await expect(page.getByRole("button", { name: /retour au dashboard/i })).toBeVisible();

    await page.goto("/payment/cancel");
    await expect(page.getByRole("heading", { name: /paiement annulé/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /réessayer/i })).toBeVisible();
  });
});
