"use server";
import { getClientByToken, updateClient } from "@/lib/store";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

async function baseUrl() {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// 相談者本人が氏名・会社名・メールを入力 → Stripeのカード登録画面へのURLを返す
export async function submitRegistrationAction(token, formData) {
  const client = await getClientByToken(token);
  if (!client) throw new Error("招待リンクが無効です");

  const name = formData.get("name")?.toString().trim();
  const companyName = formData.get("companyName")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim() || "";
  if (!name) throw new Error("氏名を入力してください");

  let stripeCustomerId = client.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ name, email: email || undefined });
    stripeCustomerId = customer.id;
  } else {
    await stripe.customers.update(stripeCustomerId, { name, email: email || undefined });
  }

  // ここではまだ「登録完了」にしない（カード登録が終わっていないため）。
  // status/defaultPaymentMethodId は register/[token]/complete で確定する。
  await updateClient(client.id, { name, companyName, email, stripeCustomerId });

  const url = await baseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    success_url: `${url}/register/${token}/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url}/register/${token}`,
  });

  return session.url;
}
