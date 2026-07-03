"use client";

import { DateGroup } from "@/lib/dateGroups";

type HistoryItem = {
  id: string;
  title: string;
};

type HistoryListProps<T extends HistoryItem> = {
  label: string;
  courseCode: string;
  groups: DateGroup<T>[];
  activeItemId?: string;
  editingItemId: string | null;
  editingTitle: string;
  newButtonLabel: string;
  emptyMessage: string;
  renderSubtitle: (item: T) => string;
  renderExtra?: (item: T) => React.ReactNode;
  setEditingTitle: (title: string) => void;
  onBeginRename: (item: T) => void;
  onCancelEdit: (item: T) => void;
  onRemove: (item: T) => void;
  onSelect: (item: T) => void;
  onNew: () => void;
  onSubmitRename: () => void;
};

export function HistoryList<T extends HistoryItem>({
  label,
  courseCode,
  groups,
  activeItemId,
  editingItemId,
  editingTitle,
  newButtonLabel,
  emptyMessage,
  renderSubtitle,
  renderExtra,
  setEditingTitle,
  onBeginRename,
  onCancelEdit,
  onRemove,
  onSelect,
  onNew,
  onSubmitRename,
}: HistoryListProps<T>) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">{label}</p>
          <p className="mt-0.5 font-mono text-xs font-bold text-[var(--app-muted-strong)]">
            {courseCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="rounded-xl bg-[var(--app-text)] px-3 py-2 text-xs font-semibold text-[var(--app-bg)] transition hover:opacity-90"
        >
          {newButtonLabel}
        </button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4 text-xs text-[var(--app-muted)]">
            {emptyMessage}
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--app-muted)]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.id === activeItemId;
                const isEditing = item.id === editingItemId;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-2 transition ${
                      isActive
                        ? "border-[var(--app-border-strong)] bg-[var(--app-surface-strong)]"
                        : "border-transparent hover:bg-[var(--app-surface-muted)]"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onSubmitRename();
                            if (e.key === "Escape") onCancelEdit(item);
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={onSubmitRename}
                          className="rounded-lg bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)]"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                            {item.title}
                          </span>
                          <span className="block text-[11px] text-[var(--app-muted)]">
                            {renderSubtitle(item)}
                          </span>
                          {renderExtra?.(item)}
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => onBeginRename(item)}
                            className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemove(item)}
                            className="rounded-md px-1.5 py-1 text-[11px] text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
