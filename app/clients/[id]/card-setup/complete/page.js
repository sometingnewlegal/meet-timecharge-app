import Link from "next/link";
import { getClient, updateClient } from "@/lib/store";
import { stripe } from "@/lib/stripe";

export default async function CardSetupCompletePage({ params, searchParams }) {
  const { id } = await params;
  const { session_id } = await searchParams;
  const client = await getClient(id);

  if (!client) {
    return (
      <main>
        <p>顧客が見つかりません。</p>
        <Link href="/clients">戻る</Link>
      </main>
    );
  }

  let errorMessage = null;
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["setup_intent"],
      });
      const paymentMethodId = session.setup_intent?.payment_method;
      if (paymentMethodId) {
        await updateClient(client.id, { defaultPaymentMethodId: paymentMethodId });
        // Stripe側でも「この顧客のデフォルト支払い方法」として明示しておく
        await stripe.customers.update(client.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      } else {
        errorMessage = "カード情報の登録が完了していないようです。もう一度お試しください。";
      }
    } catch (err) {
      errorMessage = err?.message || String(err);
    }
  }

  return (
    <main>
      <h1>カード登録</h1>
      {errorMessage ? (
        <p className="muted">エラー: {errorMessage}</p>
      ) : (
        <p>{client.name} 様のカード登録が完了しました。</p>
      )}
      <Link href="/clients">顧客管理へ戻る</Link>
    </main>
  );
}
