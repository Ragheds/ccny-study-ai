"use client";
import { useState } from "react";
export function PlanActions() {
  const [code, setCode] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(path: string) {
    setBusy(true);
    try { const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); const data = await response.json(); if (data.url) window.location.assign(data.url); else setMessage(data.error ?? data.message); }
    catch { setMessage("Needs internet. Please try again when connected."); } finally { setBusy(false); }
  }
  return <div className="space-y-3"><button disabled={busy} onClick={() => submit("/api/billing/checkout")} className="rounded-xl border p-3">Try Pro test checkout</button><label className="block">Beta invite code<input value={code} onChange={event => setCode(event.target.value)} className="block rounded-xl border p-3" maxLength={100} /></label><button disabled={busy} onClick={() => submit("/api/invites")} className="rounded-xl border p-3">Redeem invite</button><p role="status">{message}</p></div>;
}
