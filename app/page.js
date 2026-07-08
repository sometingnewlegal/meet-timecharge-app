import Link from "next/link";
import { getSessions, getClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessions = await getSessions();
  const clients = await getClients();
  const clientLabel = (id) => {
    const c = clients.find((c) => c.id === id);
    return c?.name || c?.email || "(不明)";
  };
  const pending = sessions.filter((s) => s.status === "scheduled");
  const approved = sessions.filter((s) => s.status === "approved").slice(-5).reverse();

  return (
    <main>
      <h1>タイムチャージ相談アプリ</h1>
      <div className="nav">
        <Link href="/start">相談を予約</Link>
        <Link href="/sessions">承認待ち一覧</Link>
        <Link href="/clients">顧客管理</Link>
      </div>

      <h2>承認待ち（{pending.length}件）</h2>
      {pending.length === 0 && <p className="muted">承認待ちの相談はありません。</p>}
      {pending.map((s) => (
        <div className="card" key={s.id}>
          <div>{clientLabel(s.clientId)} 様 — 予定: {new Date(s.scheduledAt).toLocaleString("ja-JP")}</div>
          <Link href={`/sessions/${s.id}/approve`}>承認画面へ →</Link>
        </div>
      ))}

      <h2>直近の承認済み</h2>
      {approved.length === 0 && <p className="muted">まだありません。</p>}
      <table>
        <tbody>
          {approved.map((s) => (
            <tr key={s.id}>
              <td>{clientLabel(s.clientId)} 様</td>
              <td>{s.billableMinutes}分</td>
              <td>{s.fee?.total?.toLocaleString()}円</td>
              <td className="muted">{s.paymentStatus ?? "-"}</td>
              <td className="muted">{new Date(s.approvedAt).toLocaleDateString("ja-JP")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
