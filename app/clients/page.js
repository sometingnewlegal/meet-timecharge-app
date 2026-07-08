import Link from "next/link";
import { getClients } from "@/lib/store";
import { addClientAction, createInviteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>顧客管理</h1>

      <h2>招待リンクで登録してもらう（おすすめ）</h2>
      <p className="muted">
        氏名・会社名・メールアドレスの入力とカード登録を、相談者ご本人にリンク経由でやってもらえます。
        カード情報の代理入力を避けられ、氏名・会社名の表記ミスも防げます。
      </p>
      <form action={createInviteAction} className="card">
        <button type="submit">招待リンクを発行</button>
      </form>

      <h2>自分で直接登録する</h2>
      <p className="muted">
        名前だけ先に控えておきたい場合など、自分で直接登録することもできます（カードは後から本人にリンクを送って登録してもらえます）。
      </p>
      <form action={addClientAction} className="card">
        <label>
          氏名
          <input type="text" name="name" required placeholder="例: 山田 太郎" />
        </label>
        <label>
          会社名（任意）
          <input type="text" name="companyName" placeholder="例: 株式会社サンプル" />
        </label>
        <label>
          メールアドレス（任意）
          <input type="email" name="email" placeholder="例: yamada@example.com" />
        </label>
        <button type="submit">顧客を登録</button>
      </form>

      <h2>登録済みの顧客（{clients.length}名）</h2>
      {clients.length === 0 && <p className="muted">まだ登録されていません。</p>}
      <table>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>
                {c.status === "pending" ? "（招待中・未入力）" : c.name}
                {c.companyName ? ` / ${c.companyName}` : ""}
              </td>
              <td className="muted">{c.email || "-"}</td>
              <td className="muted">{c.defaultPaymentMethodId ? "カード登録済み" : "未登録"}</td>
              <td>
                <Link href={`/clients/${c.id}/invite-link`}>招待リンク</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
