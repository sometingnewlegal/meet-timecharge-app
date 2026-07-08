import { getClientByToken, updateClient } from "@/lib/store";
import { stripe } from "@/lib/stripe";
import UpcomingMeetings from "../UpcomingMeetings";

export default async function RegisterCompletePage({ params, searchParams }) {
  const { token } = await params;
  const { session_id } = await searchParams;
  const client = await getClientByToken(token);

  if (!client) {
    return (
      <main>
        <p>このリンクは無効です。</p>
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
        await updateClient(client.id, { defaultPaymentMethodId: paymentMethodId, status: "active" });
        await stripe.customers.update(client.stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      } else {
        errorMessage = "カード情報の登録が完了していないようです。もう一度リンクを開いてお試しください。";
      }
    } catch (err) {
      errorMessage = err?.message || String(err);
    }
  }

  return (
    <main>
      <h1>ご登録ありがとうございました</h1>
      {errorMessage ? (
        <p className="muted">エラー: {errorMessage}</p>
      ) : (
        <>
          <p>{client.name} 様のご登録が完了しました。</p>
          <UpcomingMeetings clientId={client.id} />
        </>
      )}
    </main>
  );
}
