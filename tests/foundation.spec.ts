import { test, expect } from "@playwright/test";
test("iPhone journal, encryption, backup, restore and offline shell", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4173/form-fitness/");
  await expect(
    page.getByRole("heading", { name: "Find your form." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/form-iphone.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Log a workout", exact: true })
    .click();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("my private test passphrase");
  await page
    .getByLabel("Confirm passphrase")
    .fill("my private test passphrase");
  await page.getByRole("button", { name: "Create encrypted vault" }).click();
  await page.getByLabel("Session name").fill("Real test session");
  await page.getByLabel("Minutes").fill("35");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(
    page.getByRole("heading", { name: "Real test session" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("form.vault.v1")),
  ).not.toContain("Real test session");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export encrypted backup" }).click();
  const download = await downloadPromise;
  await download.saveAs("/private/tmp/form-test-backup.json");
  await page.getByRole("button", { name: "Lock journal", exact: true }).click();
  await page
    .getByRole("button", { name: "Unlock journal", exact: true })
    .click();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("incorrect password");
  await page
    .getByRole("button", { name: "Unlock journal", exact: true })
    .last()
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("my private test passphrase");
  await page
    .getByRole("button", { name: "Unlock journal", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Showed up. Logged it." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Real test session" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Find your form." }),
  ).toBeVisible();
  await context.setOffline(false);
  // Restore into a fresh storage origin after explicitly removing the test vault.
  await page.evaluate(() => localStorage.removeItem("form.vault.v1"));
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Restore encrypted backup")
    .setInputFiles("/private/tmp/form-test-backup.json");
  await page
    .getByRole("button", { name: "Unlock journal", exact: true })
    .click();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("my private test passphrase");
  await page
    .getByRole("button", { name: "Unlock journal", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Real test session" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
test("desktop dashboard fits", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:4173/form-fitness/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/form-desktop.png",
    fullPage: true,
  });
});
