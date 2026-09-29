import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the real app (production build) against a throwaway local database.
 *   npm run e2e
 * Set PLAYWRIGHT_CHROMIUM_PATH to use an already-installed Chromium.
 */
const PORT = 3200;
export const ADMIN_PASSWORD = "e2e-lavender-password";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    // Phone is home: the whole journey is tested on a small Android-sized screen.
    { name: "phone", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: `rm -rf .data/e2e && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      ADMIN_PASSWORD,
      ADMIN_NAME: "Ilham",
      SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghij",
      SBI_STORAGE: "file",
      SBI_DATA_DIR: ".data/e2e",
    },
  },
});
