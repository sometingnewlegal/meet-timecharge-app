"use server";
import { getSession, updateSession, getClient } from "@/lib/store";
import { calcFee } from "@/lib/feeCalc";
import { getTranscriptTiming } from "@/lib/googleMeet";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function minutesDiff(fromIso, toIso) {
  return Math.max(0, (new Date(toIso) - new Date(fromIso)) / 60000);
}

// ステップ1: 一覧から「この会議・この人」を選ぶ
export async function selectCandidateAction(formData) {
  const sessionId = formData.get("sessionId");
  const conferenceRecordName = formData.get("conferenceRecordName");
  const participantName = formData.get("participantName");
  const inRoomMinutes = Number(formData.get("inRoomMinutes"));
  const earliestStartTime = formData.get("earliestStartTime");
  const latestEndTime = formData.get("latestEndTime");

  let transcriptAvailable = false;
  let suggestedDeductionMinutes = 0;
  try {
    const timing = await getTranscriptTiming(conferenceRecordName);
    if (timing) {
      transcriptAvailable = true;
      const leading = minutesDiff(earliestStartTime, timing.firstSpeechStart);
      const trailing = latestEndTime ? minutesDiff(timing.lastSpeechEnd, latestEndTime) : 0;
      suggestedDeductionMinutes = Math.round((leading + trailing) * 10) / 10;
    }
  } catch {
    // 文字起こしが無効だった回など。手動控除にフォールバックする。
  }

  await updateSession(sessionId, {
    conferenceRecordName,
    participantName,
    inRoomMinutes,
    transcriptAvailable,
    suggestedDeductionMinutes,
  });
  revalidatePath(`/sessions/${sessionId}/approve`);
}

// 一覧に出てこない場合の手動入力
export async function manualCandidateAction(formData) {
  const sessionId = formData.get("sessionId");
  const inRoomMinutes = Number(formData.get("manualMinutes") || 0);
  await updateSession(sessionId, {
    conferenceRecordName: "manual",
    participantName: "(手動入力)",
    inRoomMinutes,
    transcriptAvailable: false,
    suggestedDeductionMinutes: 0,
  });
  revalidatePath(`/sessions/${sessionId}/approve`);
}

// 選び直す
export async function resetCandidateAction(formData) {
  const sessionId = formData.get("sessionId");
  await updateSession(sessionId, {
    conferenceRecordName: null,
    participantName: null,
    inRoomMinutes: null,
    transcriptAvailable: false,
    suggestedDeductionMinutes: 0,
  });
  revalidatePath(`/sessions/${sessionId}/approve`);
}

// 保存済みカードへ off-session 課金を試みる。結果を { paymentStatus, paymentError, paymentIntentId } で返す。
async function chargeClient(client, fee, billableMinutes) {
  if (fee.total === 0) {
    return { paymentStatus: "no_charge", paymentError: null, paymentIntentId: null };
  }
  if (!client?.stripeCustomerId || !client?.defaultPaymentMethodId) {
    return { paymentStatus: "no_card", paymentError: null, paymentIntentId: null };
  }
  try {
    // JPYはStripeでは「0桁通貨」— 100倍せず円の額そのままを渡す
    const intent = await stripe.paymentIntents.create({
      amount: fee.total,
      currency: "jpy",
      customer: client.stripeCustomerId,
      payment_method: client.defaultPaymentMethodId,
      off_session: true,
      confirm: true,
      receipt_email: client.email || undefined,
      description: `タイムチャージ相談 ${billableMinutes}分`,
    });
    return {
      paymentStatus: intent.status === "succeeded" ? "paid" : intent.status,
      paymentError: null,
      paymentIntentId: intent.id,
    };
  } catch (err) {
    return { paymentStatus: "failed", paymentError: err?.message || String(err), paymentIntentId: null };
  }
}

// ステップ2: 控除を入力して金額を確定する（保存済みカードがあればここで課金する）
export async function finalizeApprovalAction(formData) {
  const sessionId = formData.get("sessionId");
  const deductionMinutes = Number(formData.get("deductionMinutes") || 0);
  const session = await getSession(sessionId);
  const billableMinutes = Math.max(0, (session.inRoomMinutes || 0) - deductionMinutes - (session.rate.freeMinutes || 0));
  const fee = calcFee(billableMinutes, session.rate);
  const client = await getClient(session.clientId);

  const paymentResult = await chargeClient(client, fee, billableMinutes);

  await updateSession(sessionId, {
    deductionMinutes,
    billableMinutes,
    fee,
    status: "approved",
    approvedAt: new Date().toISOString(),
    ...paymentResult,
  });
  redirect(`/sessions/${sessionId}/approve`);
}

// 承認済みだが未課金・失敗の場合に、カード登録後などに再課金する
export async function retryChargeAction(formData) {
  const sessionId = formData.get("sessionId");
  const session = await getSession(sessionId);
  const client = await getClient(session.clientId);

  const paymentResult = await chargeClient(client, session.fee, session.billableMinutes);
  await updateSession(sessionId, paymentResult);
  revalidatePath(`/sessions/${sessionId}/approve`);
}
