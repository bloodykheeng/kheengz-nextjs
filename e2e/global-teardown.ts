import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * After every run: delete the throwaway `e2e-…@example.com` accounts the specs made
 * (`php artisan e2e:cleanup`, which refuses in production). Local runs only: skipped when the
 * suite points at another API (E2E_API_URL), since it shells into ../kheengz-laravel.
 */
export default function globalTeardown() {
  if (process.env.E2E_API_URL) return;
  const laravel = process.env.E2E_LARAVEL_DIR ?? path.resolve(__dirname, "../../kheengz-laravel");
  try {
    execFileSync("php", ["artisan", "e2e:cleanup"], { cwd: laravel, stdio: "inherit" });
  } catch {
    // A failed clean-up never fails the run; the accounts go at the next one.
  }
}
