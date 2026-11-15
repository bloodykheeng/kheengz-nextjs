import DashboardHome from "@/components/dashboard/home/DashboardHome";

/** The dashboard: shortcuts to what this role can open, and the shop's figures as they arrive. */
export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6">
      <DashboardHome />
    </div>
  );
}
