import { BetaTools } from "@/components/BetaTools";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileAppNav } from "@/components/MobileAppNav";
import { AppDataProvider } from "@/components/AppDataProvider";
import { loadServerStudyState } from "@/lib/supabase/serverStudyState";
import { Suspense } from "react";

// The shell stays within the device viewport. Main scrolls for dashboard and
// notes content, while the mobile navigation remains fixed at the bottom.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await loadServerStudyState();
  return (
    <AppDataProvider initial={initial}>
      <div className="flex h-dvh overflow-hidden" style={{ background: "var(--app-bg)" }}>
        <AppSidebar />
        <main data-study-workspace className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}<BetaTools /></main>
        <Suspense><MobileAppNav /></Suspense>
      </div>
    </AppDataProvider>
  );
}
