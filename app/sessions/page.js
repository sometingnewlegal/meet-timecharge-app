import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { getSessions, getClients } from "@/lib/store";
import { clientLabel } from "@/lib/clientLabel";
import { formatJstDateTime } from "@/lib/weekDates";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = (await getSessions()).slice().reverse();
  const clients = await getClients();
  const labelForClientId = (id) => clientLabel(clients.find((c) => c.id === id));

  return (
    <main>
      <HomeLink />
      <h1>相談一覧</h1>
      {sessions.length === 0 && <p className="muted">まだ相談記録がありません。</p>}
      {sessions.map((s) => (
        <div className="card" key={s.id}>
          <div>{labelForClientId(s.clientId)} 様 — {formatJstDateTime(s.scheduledAt)}</div>
          <div className="muted">
            状態: {s.status === "approved"
              ? `決済済み（${s.fee?.total?.toLocaleString()}円 / ${s.paymentStatus ?? "-"}）`
              : "決済待ち"}
          </div>
          <Link href={`/sessions/${s.id}/approve`}>
            {s.status === "scheduled" ? "時間集計・金額確定へ →" : "詳細を見る →"}
          </Link>
        </div>
      ))}
    </main>
  );
}
