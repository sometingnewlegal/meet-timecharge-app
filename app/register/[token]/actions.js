"use server";
import { getClientByToken, updateClient, createBooking } from "@/lib/store";
import { createScheduledMeeting } from "@/lib/googleMeet";
import { stripe } from "@/lib/stripe";
import { baseUrl } from "@/lib/baseUrl";
import { revalidatePath } from "next/cache";

// 相談者が候補日時から1つ選ぶ → その日時でMeetの予定を作り、予約（セッション）を確定する
export async function chooseCandidateAction(formData) {
  const token = formData.get("token")?.toString();
  const chosenIso = formData.get("chosenIso")?.toString();
  const client = await getClientByToken(token);
  if (!client?.pendingRequest) throw new Error("この予約リクエストは無効です");

  const { title, rate, durationMinutes } = client.pendingRequest;
  const endIso = new Date(new Date(chosenIso).getTime() + durationMinutes * 60 * 1000).toISOString();

  let meetingCode = null;
  let meetingUri = null;
  let calendarEventId = null;
  try {
    // attendeeEmail はあえて渡さない（Googleのカレンダー招待メールでMeetリンクが直接届くと、
    // 「登録・カード登録を終えないとリンクが手に入らない」という設計の前提が崩れるため）
    const meeting = await createScheduledMeeting({
      summary: title,
      startIso: chosenIso,
      endIso,
    });
    meetingCode = meeting.meetingCode;
    meetingUri = meeting.meetingUri;
    calendarEventId = meeting.calendarEventId;
  } catch {
    // カレンダー連携に失敗した場合は、いつも通り手動でMeetを用意する運用にフォールバックする
  }

  await createBooking({
    clientId: client.id,
    title,
    rate,
    durationMinutes,
    scheduledAt: chosenIso,
    meetingCode,
    meetingUri,
    calendarEventId,
  });
  await updateClient(client.id, { pendingRequest: null });
  revalidatePath(`/register/${token}`);
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
