"use server";
import { getSession, updateSession, getClient } from "@/lib/store";
import { calcFee, calcWithholding } from "@/lib/feeCalc";
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

// 会議選択からやり直す
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

// ステップ2: 控除（分）を入力し、金額を試算する（まだ課金しない）
export async function previewFinalizationAction(formData) {
  const sessionId = formData.get("sessionId");
  const deductionMinutes = Number(formData.get("deductionMinutes") || 0);
  const session = await getSession(sessionId);
  const billableMinutes = Math.max(0, (session.inRoomMinutes || 0) - deductionMinutes - (session.rate.freeMinutes || 0));
  const fee = calcFee(billableMinutes, session.rate);

  await updateSession(sessionId, { deductionMinutes, billableMinutes, fee });
  revalidatePath(`/sessions/${sessionId}/approve`);
}

// 控除の入力からやり直す（会議選択はやり直さない）
export async function backToDeductionAction(formData) {
  const sessionId = formData.get("sessionId");
  await updateSession(sessionId, { billableMinutes: null, fee: null });
  revalidatePath(`/sessions/${sessionId}/approve`);
}

// 保存済みカードへ off-session 課金を試みる。結果を { paymentStatus, paymentError, paymentIntentId } で返す。
async function chargeClient(client, chargeAmount, billableMinutes) {
  if (chargeAmount === 0) {
    return { paymentStatus: "no_charge", paymentError: null, paymentIntentId: null };
  }
  if (!client?.stripeCustomerId || !client?.defaultPaymentMethodId) {
    return { paymentStatus: "no_card", paymentError: null, paymentIntentId: null };
  }
  try {
    // JPYはStripeでは「0桁通貨」— 100倍せず円の額そのままを渡す
    const intent = await stripe.paymentIntents.create({
      amount: chargeAmount,
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

// ステップ3: 源泉徴収の有無を最終確認し、確定・課金する
export async function finalizeApprovalAction(formData) {
  const sessionId = formData.get("sessionId");
  const withholdingApplied = formData.get("withholdingApplied") === "on";
  const session = await getSession(sessionId);
  const client = await getClient(session.clientId);

  const withholdingAmount = withholdingApplied ? calcWithholding(session.fee.subtotal) : 0;
  const chargeAmount = session.fee.total - withholdingAmount;
  const paymentResult = await chargeClient(client, chargeAmount, session.billableMinutes);

  await updateSession(sessionId, {
    withholdingApplied,
    withholdingAmount,
    status: "approved",
    approvedAt: new Date().toISOString(),
    ...paymentResult,
  });
  redirect(`/sessions/${sessionId}/approve`);
}

// 決済済みだが未課金・失敗の場合に、カード登録後などに再課金する
export async function retryChargeAction(formData) {
  const sessionId = formData.get("sessionId");
  const session = await getSession(sessionId);
  const client = await getClient(session.clientId);

  const chargeAmount = session.fee.total - (session.withholdingAmount || 0);
  const paymentResult = await chargeClient(client, chargeAmount, session.billableMinutes);
  await updateSession(sessionId, paymentResult);
  revalidatePath(`/sessions/${sessionId}/approve`);
}
