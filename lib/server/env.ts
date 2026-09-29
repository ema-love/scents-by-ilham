import "server-only";

/**
 * Server-side configuration. Secrets are read here and nowhere else, and never use the
 * NEXT_PUBLIC_ prefix, so they cannot reach the browser bundle.
 */
const isProd = process.env.NODE_ENV === "production";

/**
 * Where data lives:
 * - "netlify-blobs" on Netlify (serverless, no persistent disk) — detected automatically
 * - "file" for local development or a Node server with a persistent disk
 */
const storage: "netlify-blobs" | "file" =
  process.env.SBI_STORAGE === "netlify-blobs" || process.env.SBI_STORAGE === "file"
    ? process.env.SBI_STORAGE
    : process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT
      ? "netlify-blobs"
      : "file";

export const serverEnv = {
  isProd,
  storage,
  /** Local database and uploads (file storage only). Never inside /public, never committed. */
  dataDir: process.env.SBI_DATA_DIR ?? ".data",
  /** The owner's dashboard password. 12+ characters. Unset = dashboard sign-in is switched off. */
  adminPassword: process.env.ADMIN_PASSWORD?.trim() || undefined,
  /** The name shown in the dashboard greeting and recorded against every admin action. */
  adminName: process.env.ADMIN_NAME?.trim() || "Ilham",
  /** Signs the admin session cookie and customers' order-access cookie. */
  sessionSecret: () => {
    const value = process.env.SESSION_SECRET?.trim();
    if (value && value.length >= 32) return value;
    if (!isProd) return "dev-only-session-secret-change-me-0123456789";
    throw new Error("SESSION_SECRET must be set (32+ random characters)");
  },
};

export const adminConfigured = () => !!serverEnv.adminPassword && serverEnv.adminPassword.length >= 12;
