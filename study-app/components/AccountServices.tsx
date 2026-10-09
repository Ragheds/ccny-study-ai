"use client";
import { usePathname } from "next/navigation";
import { SupabaseAccountBridge } from "@/components/SupabaseAccountBridge";
import { OfflineBridge } from "@/components/OfflineBridge";
// The public competition demo never starts auth, analytics or sync services.
export function AccountServices() {
  const path = usePathname();
  if (path === "/demo") return null;
  return (
    <>
      <SupabaseAccountBridge />
      <OfflineBridge />
    </>
  );
}
