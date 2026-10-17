import { Metadata } from "next";
import { Sidebar, Header } from "@/components/shared/Navigation";
import { DashboardDataProvider, TrialExpiryGuard } from "@/contexts/DashboardDataContext";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

import { getSession, getCurrentUser } from "@/lib/auth";
import { getDashboardData, getAdvisorNotificationsAction } from "@/app/actions";

import { DashboardTabContent } from "@/components/dashboard/TabSkeleton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser: any = null;
  let initialData: any = null;
  let initialNotifications: any[] = [];

  try {
    const session = await getSession();
    if (session?.userId && session?.organizationId) {
      initialUser = await getCurrentUser();
      if (initialUser) {
        initialData = await getDashboardData();
        try {
          initialNotifications = await getAdvisorNotificationsAction();
        } catch {
          initialNotifications = [];
        }
      }
    }
  } catch (err) {
    console.warn("DashboardLayout SSR prefetch error:", err);
  }

  return (
    <DashboardDataProvider
      initialData={initialData}
      initialUser={initialUser}
      initialNotifications={initialNotifications}
    >
      <div className="h-screen w-full flex bg-[#fbfbfb] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-neutral-900">
        {/* Fixed Non-Scrolling Sidebar */}
        <Sidebar />

        {/* Main Scrollable Container with stable scrollbar gutter */}
        <div
          id="dashboard-scroll-container"
          className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto no-scrollbar bg-[#fbfbfb] dark:bg-neutral-950"
        >
          {/* Top Navbar with Dynamic User & Sign Out */}
          <Header />

          {/* Content Area with Trial Expiry Guard */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
            <TrialExpiryGuard>
              <DashboardTabContent>
                {children}
              </DashboardTabContent>
            </TrialExpiryGuard>
          </main>
        </div>
      </div>
    </DashboardDataProvider>
  );
}
