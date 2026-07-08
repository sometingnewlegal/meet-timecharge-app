import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY が設定されていません（.env.local を確認してください）");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
