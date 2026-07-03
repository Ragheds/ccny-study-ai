import { ChangeEvent } from "react";

export function readTextFile(
  event: ChangeEvent<HTMLInputElement>,
  onLoad: (text: string, fileName: string) => void
): void {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    onLoad(String(readerEvent.target?.result ?? ""), file.name);
  };
  reader.readAsText(file);
}
