import Link from "next/link";
import { getSessions, getClients } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = (await getSessions()).slice().reverse();
  const clients = await getClients();
  const clientLabel = (id) => {
    const c = clients.find((c) => c.id === id);
    return c?.name || c?.email || "(不明)";
  };

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>相談一覧</h1>
      {sessions.length === 0 && <p className="muted">まだ相談記録がありません。</p>}
      {sessions.map((s) => (
        <div className="card" key={s.id}>
          <div>{clientLabel(s.clientId)} 様 — {new Date(s.scheduledAt).toLocaleString("ja-JP")}</div>
          <div className="muted">
            状態: {s.status === "approved"
              ? `承認済み（${s.fee?.total?.toLocaleString()}円 / ${s.paymentStatus ?? "-"}）`
              : "承認待ち"}
          </div>
          <Link href={`/sessions/${s.id}/approve`}>
            {s.status === "scheduled" ? "承認画面へ →" : "詳細を見る →"}
          </Link>
        </div>
      ))}
    </main>
  );
}
