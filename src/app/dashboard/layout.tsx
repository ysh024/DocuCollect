import { Metadata } from "next";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { TrialExpiryGuard } from "@/components/dashboard/TrialExpiryGuard";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardDataProvider>
      <div className="h-screen w-full flex bg-[#fbfbfb] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-neutral-900 transition-colors duration-150">
        {/* Fixed Non-Scrolling Sidebar */}
        <Sidebar />

        {/* Main Scrollable Container with stable scrollbar gutter */}
        <div
          id="dashboard-scroll-container"
          className="flex-1 flex flex-col min-w-0 h-screen overflow-y-scroll [scrollbar-gutter:stable] bg-[#fbfbfb] dark:bg-neutral-950 transition-colors duration-150"
        >
          {/* Top Navbar with Dynamic User & Sign Out */}
          <Header />

          {/* Content Area with Trial Expiry Guard and High-Speed DashboardShell */}
          <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
            <TrialExpiryGuard>
              <DashboardShell>{children}</DashboardShell>
            </TrialExpiryGuard>
          </main>
        </div>
      </div>
    </DashboardDataProvider>
  );
}
