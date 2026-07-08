import Link from "next/link";
import { getRateTemplates } from "@/lib/store";
import { createBookingAction } from "./actions";

export const dynamic = "force-dynamic";

function defaultDateTimeLocal() {
  // <input type="datetime-local"> 用に "YYYY-MM-DDTHH:mm" 形式（ローカル時刻）を作る
  const d = new Date(Date.now() + 5 * 60 * 1000); // 少し先の時刻を初期値にしておく
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); // 15分刻みに切り上げ
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
          開始日時
          <input type="datetime-local" name="scheduledAt" step="900" required defaultValue={defaultDateTimeLocal()} />
        </label>
        <label>
          相談の長さ
          <select name="durationMinutes" required defaultValue="30">
            <option value="15">15分</option>
            <option value="30">30分</option>
            <option value="45">45分</option>
            <option value="60">60分</option>
            <option value="90">90分</option>
            <option value="120">120分</option>
          </select>
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
