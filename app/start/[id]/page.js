import Link from "next/link";
import { getSession, getClients, getRateTemplates } from "@/lib/store";
import { headers } from "next/headers";

export default async function StartConfirmPage({ params }) {
  const { id } = await params;
  const session = await getSession(id);
  const client = (await getClients()).find((c) => c.id === session?.clientId);
  const template = (await getRateTemplates()).find((t) => t.id === session?.rateTemplateId);

  if (!session) {
    return (
      <main>
        <p>相談記録が見つかりません。</p>
        <Link href="/">トップへ戻る</Link>
      </main>
    );
  }

  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const registerUrl = `${protocol}://${host}/register/${client.inviteToken}`;

  return (
    <main>
      <h1>予約が完了しました</h1>
      <div className="card">
        <p>相談者: {client?.email}</p>
        <p>単価: {template?.name}</p>
        <p className="muted">予定日時: {new Date(session.scheduledAt).toLocaleString("ja-JP")}</p>
      </div>

      <p>
        次のリンクを相談者に送ってください。氏名・カード登録が完了すると、そのページ上にMeetリンクが表示されます
        （このアプリからMeetリンクを直接送る必要はありません）。
      </p>
      <div className="card">
        <input type="text" readOnly value={registerUrl} />
      </div>

      {!session.meetingUri && (
        <p className="muted">
          ※ Meetリンクの自動発行に失敗しました。いつも通り手動でMeetを用意し、相談者に共有してください
          （承認時に手動で在室時間を入力できます）。
        </p>
      )}

      <p>相談が終わったら、承認画面から金額を確定します。</p>
      <div className="nav">
        <Link href={`/sessions/${session.id}/approve`}>相談が終わったら承認画面へ →</Link>
      </div>
    </main>
  );
}
