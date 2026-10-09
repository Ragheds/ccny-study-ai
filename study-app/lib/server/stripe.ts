import "server-only";
import Stripe from "stripe";
export function testStripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) throw new Error("Stripe test mode is not configured.");
  return new Stripe(key);
}
