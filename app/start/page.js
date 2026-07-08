import Link from "next/link";
import { getRateTemplates } from "@/lib/store";
import { createScheduleRequestAction } from "./actions";

export const dynamic = "force-dynamic";

function defaultDateTimeLocal(offsetMinutes) {
  // <input type="datetime-local"> 用に "YYYY-MM-DDTHH:mm" 形式（ローカル時刻）を作る
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
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
      <h1>相談日程の候補を送る</h1>
      <p className="muted">
        相談者の氏名やカード情報が無くても送れます（初回相談を想定）。
        候補日時を2〜3個指定して送ると、相談者はリンク上でその中から都合の良い日時を選べます。
        日時が決まるとMeetの予定が自動発行され、続けて氏名・カード登録に進んでもらう流れです。
        （このアプリからMeetリンクを直接送る必要はありません。発行される1本のリンクだけ送ってください）
      </p>

      <form action={createScheduleRequestAction} className="card">
        <label>
          相談者のメールアドレス
          <input type="email" name="email" required placeholder="例: yamada@example.com" />
        </label>
        <label>
          候補1
          <input type="datetime-local" name="candidate1" step="900" required defaultValue={defaultDateTimeLocal(60)} />
        </label>
        <label>
          候補2（任意）
          <input type="datetime-local" name="candidate2" step="900" defaultValue={defaultDateTimeLocal(180)} />
        </label>
        <label>
          候補3（任意）
          <input type="datetime-local" name="candidate3" step="900" />
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
        <button type="submit">この内容で候補を送る</button>
      </form>
    </main>
  );
}
