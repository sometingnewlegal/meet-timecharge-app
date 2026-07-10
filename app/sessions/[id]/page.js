import Link from "next/link";
import { getSession, getClients } from "@/lib/store";
import { clientLabel } from "@/lib/clientLabel";
import { formatJstEndHM, formatJstHM, toJstParts } from "@/lib/weekDates";
import { calcFee } from "@/lib/feeCalc";

export const dynamic = "force-dynamic";

const PAYMENT_STATUS_LABEL = {
  paid: "課金完了",
  no_charge: "0円のため課金なし",
  no_card: "カード未登録のため未課金",
  failed: "課金失敗",
  requires_action: "カードの追加認証が必要（顧客対応が必要）",
  processing: "処理中",
};

export default async function SessionDetailPage({ params }) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    return (
      <main>
        <p>相談記録が見つかりません。</p>
        <Link href="/">トップへ戻る</Link>
      </main>
    );
  }

  const client = (await getClients()).find((c) => c.id === session.clientId);
  const { month, day, weekday } = toJstParts(session.scheduledAt);
  const timeRange = session.durationMinutes
    ? `${formatJstHM(session.scheduledAt)}~${formatJstEndHM(session.scheduledAt, session.durationMinutes)}`
    : formatJstHM(session.scheduledAt);
  const isPast = new Date(session.scheduledAt).getTime() <= Date.now();
  const estimate = session.status === "scheduled" && session.durationMinutes && session.rate
    ? calcFee(session.durationMinutes, session.rate)
    : null;

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>{clientLabel(client)} 様</h1>

      <div className="card">
        <div className="detail-row">
          <span className="detail-row-label">日時</span>
          <span className="detail-row-value">
            {month}/{day}({weekday}) {timeRange}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">単価</span>
          <span className="detail-row-value">
            {session.rate ? `${session.rate.unitMinutes}分あたり${session.rate.pricePerUnit.toLocaleString()}円` : "-"}
          </span>
        </div>
        {estimate && (
          <div className="detail-row">
            <span className="detail-row-label">概算金額</span>
            <span className="detail-row-value">{estimate.total.toLocaleString()}円</span>
          </div>
        )}
        {session.status === "approved" && (
          <div className="detail-row">
            <span className="detail-row-label">決済状況</span>
            <span className="detail-row-value">
              {PAYMENT_STATUS_LABEL[session.paymentStatus] ?? session.paymentStatus ?? "不明"}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="detail-row">
          <span className="detail-row-label">連絡先</span>
          <span className="detail-row-value">{client?.email || "未登録"}</span>
        </div>
        {client?.companyName && (
          <div className="detail-row">
            <span className="detail-row-label">会社名</span>
            <span className="detail-row-value">{client.companyName}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-row-label">カード登録</span>
          <span className="detail-row-value">{client?.defaultPaymentMethodId ? "済み" : "未登録"}</span>
        </div>
      </div>

      {session.meetingUri && (
        <a href={session.meetingUri} target="_blank" rel="noreferrer" className="card" style={{ display: "block" }}>
          Google Meetを開く →
        </a>
      )}

      {!client?.defaultPaymentMethodId && client?.id && (
        <p className="muted">
          <Link href={`/clients/${client.id}/invite-link`}>招待リンクを確認</Link>
        </p>
      )}

      {isPast && session.status === "scheduled" && (
        <>
          <Link href={`/sessions/${session.id}/approve`} className="new-session-button">
            時間集計・金額確定へ
          </Link>
          <p className="muted">
            Meetの記録から実施時間を集計し、金額を確定します。確定すると登録済みカードに自動で課金されます。
          </p>
        </>
      )}
    </main>
  );
}
