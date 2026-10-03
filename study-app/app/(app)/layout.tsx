import { AppSidebar } from "@/components/AppSidebar";
import { AppDataProvider } from "@/components/AppDataProvider";
import { loadServerStudyState } from "@/lib/supabase/serverStudyState";

// Every page inside this shell keeps a fixed viewport — nothing here scrolls
// except what a page explicitly opts into. The old approach guessed a pixel
// height ("100dvh - 180px") for individual pages, which broke on any device
// where the navbar/tab bar rendered at a different height than assumed. This
// removes the guess entirely: h-dvh fixes the shell to the real viewport,
// min-h-0 is the flexbox detail that lets <main> actually shrink to fit
// instead of growing to match its content and pushing the page itself into
// a scroll. A page that needs internal scrolling (like AI Tutor's message
// list) adds its own overflow-y-auto on an inner wrapper — never on <main>.
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
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </AppDataProvider>
  );
}
