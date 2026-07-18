import Stripe from "stripe";
import type { SubscriptionPlan } from "@/lib/supabase/types";

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export type CheckoutInterval = "monthly" | "annual";

// Founding-member pricing (spec 6.2) is implemented as a permanent Stripe
// coupon over these same Regular prices, redeemed via Stripe Checkout's own
// promotion-code field — not a separate set of Price objects. That's the
// exact approach the spec's "Stripe implementation" note describes, and it
// means "removing it from the signup flow" after the first 100 subscribers
// is just deactivating the coupon in the Stripe dashboard, no code change.
export function getPriceId(interval: CheckoutInterval): string | undefined {
  return interval === "monthly"
    ? process.env.STRIPE_PRICE_REGULAR_MONTHLY
    : process.env.STRIPE_PRICE_REGULAR_ANNUAL;
}

export const PRICING_COPY: Record<CheckoutInterval, { label: string; price: string; sub: string }> = {
  monthly: { label: "Monthly", price: "$4.99/mo", sub: "Billed monthly" },
  annual: { label: "Annual", price: "$44.99/yr", sub: "$3.75/mo — best value" },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  founding_monthly: "Founding member — Monthly",
  founding_annual: "Founding member — Annual",
  regular_monthly: "Premium — Monthly",
  regular_annual: "Premium — Annual",
};

// A "founding member" plan is the same Regular price with a Stripe coupon
// applied (redeemed via Checkout's own promotion-code field), so plan is
// derived from price ID + whether a discount landed on the subscription,
// not from a distinct set of founding Price objects.
export function resolvePlanFromPrice(
  priceId: string | null | undefined,
  hasDiscount: boolean,
): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_REGULAR_MONTHLY) {
    return hasDiscount ? "founding_monthly" : "regular_monthly";
  }
  if (priceId === process.env.STRIPE_PRICE_REGULAR_ANNUAL) {
    return hasDiscount ? "founding_annual" : "regular_annual";
  }
  return null;
}
