import { Metadata } from "next";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { TrialExpiryGuard } from "@/components/dashboard/TrialExpiryGuard";

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
    <div className="h-screen w-full flex bg-[#fbfbfb] text-neutral-900 overflow-hidden selection:bg-neutral-900 selection:text-white">
      {/* Fixed Non-Scrolling Sidebar */}
      <Sidebar />

      {/* Main Scrollable Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar with Dynamic User & Sign Out */}
        <Header />

        {/* Content Area with Trial Expiry Guard */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <TrialExpiryGuard>
            {children}
          </TrialExpiryGuard>
        </main>
      </div>
    </div>
  );
}
