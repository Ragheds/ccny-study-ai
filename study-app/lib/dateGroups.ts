export type DateLabel = "Today" | "Yesterday" | "Last Week" | "Older";

export type DateGroup<T> = {
  label: DateLabel;
  items: T[];
};

export function groupByDate<T>(
  items: T[],
  getTimestamp: (item: T) => number
): DateGroup<T>[] {
  const now = Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

  const groups: DateGroup<T>[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last Week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const item of items) {
    const ts = getTimestamp(item);
    if (ts >= today) {
      groups[0].items.push(item);
    } else if (ts >= yesterday) {
      groups[1].items.push(item);
    } else if (ts >= lastWeek) {
      groups[2].items.push(item);
    } else {
      groups[3].items.push(item);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}
