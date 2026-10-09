import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";
export async function studentAccess() {
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Study service is unavailable.");
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  const { data: sub, error: subscriptionError } = await db.from("subscriptions").select("plan,status,beta_until,period_end").eq("user_id", data.user.id).maybeSingle();
  if (subscriptionError) throw new Error("Apply the plan migration before using AI.");
  const pro = Date.parse(sub?.beta_until ?? "") > Date.now() || (sub?.plan === "pro" && ["active", "trialing"].includes(sub.status) && Date.parse(sub.period_end ?? "") > Date.now());
  const plan: PlanId = pro ? "pro" : "free";
  return { db, user: data.user, plan, limits: PLANS[plan] };
}
