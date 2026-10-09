import { studentAccess } from "@/lib/server/access";
import { PLANS } from "@/lib/plans";
import { PlanActions } from "@/components/PlanActions";
export default async function PlansPage() {
  const access = await studentAccess().catch(() => null);
  return <section className="mx-auto max-w-2xl space-y-6 p-6"><h1 className="text-2xl font-semibold">Study plans</h1><p>Current plan: {access?.plan ?? "sign in to check"}</p><p>Free: {PLANS.free.requestsPerDay} AI requests/day and one offline course pack.</p><p>Pro: about ${PLANS.pro.monthlyUSD}/month, {PLANS.pro.requestsPerDay} requests/day and more study tools. Limits are beta placeholders.</p><p>Billing is test mode only. No real payments.</p><PlanActions /></section>;
}
