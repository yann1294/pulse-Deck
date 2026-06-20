import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 900 },
  { name: "mobile-390", width: 390, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 }
];

const publicRoutes = [
  { name: "home", path: "/" },
  { name: "submit-ticket", path: "/submit-ticket" },
  { name: "sign-in", path: "/sign-in" },
  { name: "sign-up", path: "/sign-up" }
];

for (const viewport of viewports) {
  test.describe(`${viewport.name} responsive smoke`, () => {
    test.use({ viewport });

    for (const route of publicRoutes) {
      test(`${route.name} has no horizontal page overflow`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("body")).toBeVisible();

        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return Math.ceil(root.scrollWidth - root.clientWidth);
        });

        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  });
}

test("protected workspace routes redirect unauthenticated users to sign in", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/knowledge-base", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/sign-in/);
});
