import type { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import SessionProviders from "@/components/auth/SessionProviders";
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
 * prerendered and navigates instantly. The dark theme goes on before the first paint from the
 * root layout's boot script (lib/themeBoot.ts).
 */
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviders>
      <DashboardLayout>{children}</DashboardLayout>
    </SessionProviders>
  );
}
