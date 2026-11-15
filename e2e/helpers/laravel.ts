import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Reads from the local API what an email would carry (a sign-up code). Local runs only: it shells out
 * to `php artisan tinker` in ../kheengz-laravel, so never point it at staging.
 */
const LARAVEL = process.env.E2E_LARAVEL_DIR ?? path.resolve(__dirname, "../../../kheengz-laravel");

function tinker(code: string): string {
  return execFileSync("php", ["artisan", "tinker", `--execute=${code}`], { cwd: LARAVEL, encoding: "utf8" }).trim();
}

/** The 6-digit code last sent to this address (App\Services\EmailVerification keeps it in the cache). */
export function verificationCodeFor(email: string): string {
  // String.raw keeps the PHP namespace backslashes (a template literal would drop them).
  const out = tinker(String.raw`$u = App\Models\User::where('email', '${email.replace(/'/g, "")}')->first(); echo $u ? Illuminate\Support\Facades\Cache::get('email-verification:'.$u->id) : '';`);
  const code = out.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`No verification code found for ${email}: ${out}`);
  return code;
}

/** A NIN nobody has used: CM, then 12 letters and digits. */
export function freshNin(): string {
  const tail = `${Date.now()}`.slice(-10) + "XY";
  return `CM${tail}`;
}
