import type { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import SessionProviders from "@/components/auth/SessionProviders";
import { THEME_BOOT_SCRIPT } from "@/contexts/ThemeContext";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: "Dashboard",
  },
  description: "Run the marketplace or your shop: orders, products, payouts and the people who help.",
  // Signed-in pages are nobody's to index or share.
  robots: { index: false, follow: false },
};

/**
 * Static: no cookies are read on the server (see SessionProviders), so every dashboard page is
 * prerendered and navigates instantly. The script puts a dark theme on before the first paint.
 */
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      <SessionProviders>
        <DashboardLayout>{children}</DashboardLayout>
      </SessionProviders>
    </>
  );
}
