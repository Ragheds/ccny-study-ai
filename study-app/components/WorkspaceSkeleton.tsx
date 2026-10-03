export function WorkspaceSkeleton() {
  return (
    <div className="flex h-full animate-pulse" aria-label="Loading study workspace" role="status">
      <div className="hidden w-[220px] shrink-0 space-y-4 border-r border-[var(--app-border)] p-4 md:block">
        <div className="h-8 rounded-lg bg-[var(--app-surface-muted)]" />
        <div className="h-5 w-2/3 rounded bg-[var(--app-surface-muted)]" />
        <div className="h-5 rounded bg-[var(--app-surface-muted)]" />
        <div className="h-5 w-4/5 rounded bg-[var(--app-surface-muted)]" />
      </div>
      <div className="w-full space-y-6 p-6">
        <div className="h-8 w-2/5 rounded bg-[var(--app-surface-muted)]" />
        <div className="h-12 rounded-xl bg-[var(--app-surface-muted)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-2xl bg-[var(--app-surface-muted)]" />
          <div className="h-36 rounded-2xl bg-[var(--app-surface-muted)]" />
        </div>
      </div>
    </div>
  );
}
