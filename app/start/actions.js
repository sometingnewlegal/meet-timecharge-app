"use server";
import { findOrCreateClientByEmail, createBooking } from "@/lib/store";
import { createScheduledMeeting } from "@/lib/googleMeet";
import { redirect } from "next/navigation";

export async function createBookingAction(formData) {
  const email = formData.get("email")?.toString().trim();
  const rateTemplateId = formData.get("rateTemplateId");
  const scheduledAtLocal = formData.get("scheduledAt")?.toString(); // datetime-local (ローカル時刻、TZ無し)
  const durationMinutes = Number(formData.get("durationMinutes")) || 30;
  if (!email || !rateTemplateId || !scheduledAtLocal) return;

  const client = await findOrCreateClientByEmail(email);
  const scheduledAt = new Date(scheduledAtLocal).toISOString();
  const endIso = new Date(new Date(scheduledAtLocal).getTime() + durationMinutes * 60 * 1000).toISOString();

  let meetingCode = null;
  let meetingUri = null;
  let calendarEventId = null;
  try {
    // attendeeEmail はあえて渡さない：
    // Googleのカレンダー招待メールで生のMeetリンクが直接届くと、
    // 「登録・カード登録を終えないとリンクが手に入らない」というこの設計の前提が崩れるため。
    const meeting = await createScheduledMeeting({
      summary: `タイムチャージ相談（${email}）`,
      startIso: scheduledAt,
      endIso,
    });
    meetingCode = meeting.meetingCode;
    meetingUri = meeting.meetingUri;
    calendarEventId = meeting.calendarEventId;
  } catch {
    // カレンダー連携に失敗した場合は、いつも通り手動でMeetを用意する運用にフォールバックする
  }

  const session = await createBooking({
    clientId: client.id,
    rateTemplateId,
    scheduledAt,
    meetingCode,
    meetingUri,
    calendarEventId,
  });
  redirect(`/start/${session.id}`);
}
