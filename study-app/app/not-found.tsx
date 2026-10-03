import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--app-bg)", color: "var(--app-text)" }}
    >
      <div className="max-w-sm text-center">
        <BrandMark size="lg" variant="app" className="mx-auto mb-6" />

        <p
          className="mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--app-accent)" }}
        >
          404
        </p>

        <h1 className="mb-2 text-xl font-bold">Page not found</h1>

        <p className="mb-8 text-sm" style={{ color: "var(--app-muted)" }}>
          That page doesn&apos;t exist, or may have moved. Your courses, chats,
          and flashcards are all still where you left them.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex rounded-xl px-6 py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ background: "var(--app-text)", color: "var(--app-bg)" }}
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}