import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: { browserName: "chromium" },
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173/form-fitness/",
    reuseExistingServer: !process.env.CI,
  },
});
