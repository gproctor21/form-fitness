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
    page.getByRole("heading", { name: "Today." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("form-iphone.png"),
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
  await download.saveAs(test.info().outputPath("form-test-backup.json"));
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
  await expect(page.getByRole("dialog")).not.toBeVisible();
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
    page.getByRole("heading", { name: "Today." }),
  ).toBeVisible();
  await context.setOffline(false);
  // Restore into a fresh storage origin after explicitly removing the test vault.
  await page.evaluate(() => localStorage.removeItem("form.vault.v1"));
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Restore encrypted backup")
    .setInputFiles(test.info().outputPath("form-test-backup.json"));
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
  await expect(page.getByRole("dialog")).not.toBeVisible();
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
    path: test.info().outputPath("form-desktop.png"),
    fullPage: true,
  });
});
test("Health import survives workout edits and the Chat tab shares only on request", async ({
  page,
}) => {
  await page.goto("http://localhost:4173/form-fitness/");
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await page.getByRole("button", { name: "Create vault", exact: true }).click();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("temporary health test passphrase");
  await page
    .getByLabel("Confirm passphrase")
    .fill("temporary health test passphrase");
  await page
    .getByRole("button", { name: "Create encrypted vault", exact: true })
    .click();
  await page
    .getByText("Or paste a Shortcut’s JSON output", { exact: true })
    .click();
  await page
    .getByLabel("Health summary JSON")
    .fill(
      JSON.stringify({
        version: 1,
        days: [
          { date: "2025-01-01", source: "Browser test source", steps: 1234 },
        ],
      }),
    );
  await page
    .getByRole("button", { name: "Review summary", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review 1 day", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save Health summary", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Health summary saved in your encrypted vault.",
  );
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await page.getByRole("button", { name: "Add session", exact: true }).click();
  await page.getByLabel("Session name").fill("Health preservation test");
  await page.getByLabel("Minutes").fill("10");
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Health preservation test",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.getByLabel("Summary to share")).toHaveValue(
    /Browser test source/,
  );
  await expect(page.getByLabel("Summary to share")).toHaveValue(
    /Health preservation test/,
  );
  await expect(
    page.getByRole("link", { name: "Open Health & Fitness" }),
  ).toHaveAttribute(
    "href",
    "https://chatgpt.com/g/g-p-6aebcd1c6770819185f3e20e1258dc36/project",
  );
  const stored = await page.evaluate(() =>
    localStorage.getItem("form.vault.v1"),
  );
  expect(stored).not.toContain("Browser test source");
  await page.reload();
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await page.getByRole("button", { name: "Unlock vault", exact: true }).click();
  await page
    .getByLabel("Passphrase", { exact: true })
    .fill("temporary health test passphrase");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Unlock journal", exact: true })
    .click();
  await expect(page.getByText(/Browser test source · Imported/)).toBeVisible();
});
