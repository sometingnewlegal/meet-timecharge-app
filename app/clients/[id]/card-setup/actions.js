"use server";
import { getClient, updateClient } from "@/lib/store";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

async function baseUrl() {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// カード登録用の Stripe Checkout（setupモード）セッションを作り、その遷移先URLを返す。
// Next.js の Server Action から外部ドメインへ redirect() すると遷移が効かない場合があるため、
// URLをクライアントに返して window.location で遷移させる。
export async function createCardSetupUrl(clientIdRaw) {
  const clientId = clientIdRaw?.toString();
  const client = await getClient(clientId);
  if (!client) throw new Error("client not found");

  let stripeCustomerId = client.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: client.name,
      email: client.email || undefined,
    });
    stripeCustomerId = customer.id;
    await updateClient(client.id, { stripeCustomerId });
  }

  const url = await baseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    success_url: `${url}/clients/${client.id}/card-setup/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url}/clients`,
  });

  return session.url;
}
