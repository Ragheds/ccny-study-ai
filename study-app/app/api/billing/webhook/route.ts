import { testStripe } from "@/lib/server/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  let event;
  try { event = testStripe().webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? ""); }
  catch { return Response.json({ error: "Invalid signature." }, { status: 400 }); }
  if (event.livemode) return Response.json({ error: "Only test events are accepted." }, { status: 400 });
  if (!event.type.startsWith("customer.subscription.")) return Response.json({ received: true });
  try {
    const object = event.data.object;
    if (!("id" in object)) return Response.json({ error: "Missing subscription." }, { status: 400 });
    const subscription = await testStripe().subscriptions.retrieve(object.id);
    const userId = subscription.metadata.user_id;
    if (!userId) return Response.json({ error: "Missing student metadata." }, { status: 400 });
    const period = Math.max(...subscription.items.data.map(item => item.current_period_end));
    const { error } = await createSupabaseAdminClient().rpc("apply_test_subscription", {
      p_event: event.id, p_created: event.created, p_user: userId, p_status: subscription.status,
      p_customer: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      p_subscription: subscription.id, p_period: new Date(period * 1000).toISOString(),
    });
    if (error) throw error;
    return Response.json({ received: true });
  } catch { return Response.json({ error: "Webhook will be retried." }, { status: 500 }); }
}
