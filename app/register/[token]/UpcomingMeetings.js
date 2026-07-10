import { getSessionsByClient } from "@/lib/store";
import { formatJstDateTime } from "@/lib/weekDates";

// 登録・カード登録が完了した相談者にだけ見せる、予約済み相談のMeetリンク一覧。
// ここが唯一Meetリンクが渡る場所（カレンダー招待メールでは送っていない）。
export default async function UpcomingMeetings({ clientId }) {
  const sessions = (await getSessionsByClient(clientId)).filter((s) => s.status === "scheduled");

  if (sessions.length === 0) {
    return <p className="muted">現在、予約されているご相談はありません。</p>;
  }

  return (
    <>
      <h2>ご相談の予定</h2>
      {sessions.map((s) => (
        <div className="card" key={s.id}>
          <p>予定日時: {formatJstDateTime(s.scheduledAt)}</p>
          {s.meetingUri ? (
            <p>
              当日はこちらのリンクからご参加ください:
              <br />
              <a href={s.meetingUri} target="_blank" rel="noopener noreferrer">
                {s.meetingUri}
              </a>
            </p>
          ) : (
            <p className="muted">Meetリンクは別途ご案内いたします。</p>
          )}
        </div>
      ))}
    </>
  );
}
