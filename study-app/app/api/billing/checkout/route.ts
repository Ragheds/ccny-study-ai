import { studentAccess } from "@/lib/server/access";
import { testStripe } from "@/lib/server/stripe";
import { PLANS } from "@/lib/plans";
export async function POST() {
  try {
    const access = await studentAccess();
    if (!access) return Response.json({ error: "Sign in first." }, { status: 401 });
    const origin = process.env.APP_ORIGIN;
    if (!origin) return Response.json({ error: "Test billing is not configured." }, { status: 503 });
    const stripe = testStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", client_reference_id: access.user.id,
      subscription_data: { metadata: { user_id: access.user.id } },
      line_items: [{ price_data: { currency: "usd", unit_amount: PLANS.pro.monthlyUSD * 100, recurring: { interval: "month" }, product_data: { name: "CCNY Study AI Pro (test)" } }, quantity: 1 }],
      success_url: `${origin}/plans?checkout=success`, cancel_url: `${origin}/plans?checkout=cancelled`,
    });
    return Response.json({ url: session.url });
  } catch { return Response.json({ error: "Test checkout is unavailable." }, { status: 503 }); }
}
