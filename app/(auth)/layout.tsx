import type { Metadata } from "next";
import ThemeToggle from "@/components/common/ThemeToggle";
import SessionProviders from "@/components/auth/SessionProviders";
import { THEME_BOOT_SCRIPT } from "@/contexts/ThemeContext";

// The root layout already supplies the title template; sign-in and reset pages
// only need to stay out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Sign-in needs the session and the theme, both read in the browser (see SessionProviders). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <SessionProviders>
        <div className="relative min-h-screen bg-(--cream)">
          {/* Floating theme toggle: visible on all auth pages */}
          <div className="fixed right-4 top-4 z-50">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </SessionProviders>
    </>
  );
}
