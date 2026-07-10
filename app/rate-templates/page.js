import Link from "next/link";
import { getRateTemplates } from "@/lib/store";
import { addRateTemplateAction, deleteRateTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RateTemplatesPage() {
  const templates = await getRateTemplates();

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>単価テンプレート</h1>
      <p className="muted">
        よく使う単価をテンプレとして登録しておくと、相談日程の候補送信画面（/start）で選ぶだけで単価欄に自動入力されます。
        登録は任意で、テンプレを使わずその場で自由入力することもできます。
      </p>

      <form action={addRateTemplateAction} className="card">
        <label>
          テンプレ名
          <input type="text" name="name" required placeholder="例: 通常相談" />
        </label>
        <label>
          単位分
          <select name="unitMinutes" required defaultValue="15">
            <option value="15">15分</option>
            <option value="30">30分</option>
            <option value="45">45分</option>
            <option value="60">60分</option>
          </select>
        </label>
        <label>
          単価（円・税別）
          <input type="number" name="pricePerUnit" required min="0" step="1" defaultValue="5000" />
        </label>
        <button type="submit">テンプレを登録</button>
      </form>

      <h2>登録済みテンプレート（{templates.length}件）</h2>
      {templates.length === 0 && <p className="muted">まだ登録されていません。</p>}
      {templates.map((t) => (
        <div className="card" key={t.id}>
          <div>
            {t.name} — {t.unitMinutes}分あたり{t.pricePerUnit.toLocaleString()}円（税別）
          </div>
          <form action={deleteRateTemplateAction}>
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className="secondary">削除</button>
          </form>
        </div>
      ))}
    </main>
  );
}
