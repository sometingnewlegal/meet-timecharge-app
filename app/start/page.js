import Link from "next/link";
import { getRateTemplates } from "@/lib/store";
import { createBookingAction } from "./actions";

export const dynamic = "force-dynamic";

function defaultDateTimeLocal() {
  // <input type="datetime-local"> 用に "YYYY-MM-DDTHH:mm" 形式（ローカル時刻）を作る
  const d = new Date(Date.now() + 5 * 60 * 1000); // 少し先の時刻を初期値にしておく
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function StartPage() {
  const templates = await getRateTemplates();

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>相談を予約する</h1>
      <p className="muted">
        相談者の氏名やカード情報が無くても予約できます（初回相談を想定）。
        予約すると専用のMeetリンクが発行されますが、相談者には直接送りません。
        発行される招待リンク（登録ページ）だけを送ってください。氏名・カード登録が完了すると、
        そのページ上にMeetリンクが表示される仕組みです。
      </p>

      <form action={createBookingAction} className="card">
        <label>
          相談者のメールアドレス
          <input type="email" name="email" required placeholder="例: yamada@example.com" />
        </label>
        <label>
          予定日時
          <input type="datetime-local" name="scheduledAt" required defaultValue={defaultDateTimeLocal()} />
        </label>
        <label>
          単価テンプレート
          <select name="rateTemplateId" required defaultValue={templates[0]?.id}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <button type="submit">この内容で予約する</button>
      </form>
    </main>
  );
}
