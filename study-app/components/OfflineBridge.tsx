"use client";
import { useEffect } from "react";
import { syncEdits } from "@/lib/offline/db";
export function OfflineBridge() {
  useEffect(() => {
    const sync = () => {
      syncEdits().catch(() => {});
    };
    window.addEventListener("online", sync);
    sync();
    const timer = setInterval(sync, 30000);
    return () => {
      window.removeEventListener("online", sync);
      clearInterval(timer);
    };
  }, []);
  return null;
}
