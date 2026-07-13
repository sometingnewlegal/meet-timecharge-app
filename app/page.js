import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSessions, getClients } from "@/lib/store";
import { clientLabel } from "@/lib/clientLabel";
import { formatJstHM, formatJstDate, formatJstEndHM, toJstParts } from "@/lib/weekDates";
import { calcFee } from "@/lib/feeCalc";

export const dynamic = "force-dynamic";

// 日付ラベル（例: 7/15(水)）。カードの主役として大きく表示する。
function sessionDateLabel(iso) {
  const { month, day, weekday } = toJstParts(iso);
  return `${month}/${day}(${weekday})`;
}

// 開始〜終了の時刻範囲（例: 14:00~15:00）。durationMinutesを持たない古いセッションは開始時刻のみ。
function sessionTimeRange(session) {
  const start = formatJstHM(session.scheduledAt);
  if (!session.durationMinutes) return start;
  return `${start}~${formatJstEndHM(session.scheduledAt, session.durationMinutes)}`;
}

// 単価だけの小さなメタ情報。所要時間は終了時刻から分かるのでここには出さない。
function rateLabel(rate) {
  return rate ? `${rate.unitMinutes}分あたり${rate.pricePerUnit.toLocaleString()}円` : "";
}

// 未請求の相談は、予約時に選んだ相談時間をもとにした概算額（実際の請求は決済確認画面で確定）
function estimatedFee(session) {
  if (!session.durationMinutes || !session.rate) return null;
  return calcFee(session.durationMinutes, session.rate);
}

// 金額は確定済みだが課金がうまくいっていない状態。弁護士側だけでは直せないことも多いので
// 「要再課金」ではなく「要確認」とし、依頼者へのフォローアップが必要なことが伝わるようにする
const PAYMENT_ISSUE_LABEL = { no_card: "カード未登録", failed: "課金失敗" };
// 金額は確定済み・課金も試みた上で、結果待ちの状態（弁護士側にできることは無い）
const PAYMENT_PENDING_LABEL = { processing: "処理中", requires_action: "カードの追加認証待ち" };

export default async function Home() {
  const sessions = await getSessions();
  const clients = await getClients();
  const clientById = (id) => clients.find((c) => c.id === id);
  const now = Date.now();

  // 時系列 + 緊急度でフェーズを分ける。
  // 「未請求」「要確認」はまだ弁護士側の対応が要る＝畳まずに常に見える場所に置く。
  // 「決済待ち（真の意味）」「決済済み」は対応不要な状態なので、従来通り折りたたんでおく。
  const waitingForDate = clients.filter((c) => c.pendingRequest);
  const upcoming = sessions.filter(
    (s) => s.status === "scheduled" && new Date(s.scheduledAt).getTime() > now
  );
  // 未請求: 実施時刻を過ぎたのに、まだ金額算定にすら着手していない
  const unbilled = sessions.filter(
    (s) => s.status === "scheduled" && new Date(s.scheduledAt).getTime() <= now
  );
  // 要確認: 金額は確定済みだが課金できていない（カード未登録／課金失敗）。依頼者への確認が必要
  const needsReview = sessions.filter(
    (s) => s.status === "approved" && (s.paymentStatus === "no_card" || s.paymentStatus === "failed")
  );
  // 決済待ち: 金額確定・課金試行済みで、結果待ち（弁護士側にできることはない）
  const trulyPending = sessions.filter(
    (s) => s.status === "approved" && (s.paymentStatus === "processing" || s.paymentStatus === "requires_action")
  );
  // 決済済み: 課金完了、または0円で課金不要
  const paidDone = sessions.filter(
    (s) => s.status === "approved" && (s.paymentStatus === "paid" || s.paymentStatus === "no_charge")
  );
  const paidToShow = paidDone.slice(-20).reverse();
  const endedCount = trulyPending.length + paidDone.length;

  function cardMissingNote(session) {
    const client = clientById(session.clientId);
    if (client?.defaultPaymentMethodId) return null;
    return <span className="muted">（カード未登録）</span>;
  }

  return (
    <main>
      <div className="page-header">
        <h1>タイムチャージ相談アプリ</h1>
        <Link href="/start" className="new-session-button">
          新規作成
        </Link>
      </div>

      {unbilled.length > 0 && (
        <section className="phase-section">
          <h2 className="urgent-heading">
            <span className="urgent-icon" aria-hidden="true">!</span>
            未請求（{unbilled.length}件）
          </h2>
          <div className="card-group card-group--urgent">
            {unbilled.map((s) => {
              const estimate = estimatedFee(s);
              const when = `${sessionDateLabel(s.scheduledAt)} ${sessionTimeRange(s)}実施`;
              return (
                <Link href={`/sessions/${s.id}`} className="card-group-item" key={s.id}>
                  <div className="session-highlight">
                    <span className="session-highlight-value">{estimate.total.toLocaleString()}円</span>
                    <span className="session-highlight-time">概算</span>
                  </div>
                  <div className="session-details">
                    <div className="session-client">{clientLabel(clientById(s.clientId))} 様</div>
                    <p className="muted session-meta">{when}</p>
                    {cardMissingNote(s)}
                  </div>
                  <ChevronRight className="card-group-chevron" size={20} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {waitingForDate.length > 0 && (
        <section className="phase-section">
          <h2>日程選択待ち（{waitingForDate.length}件）</h2>
          <div className="card-group">
            {waitingForDate.map((c) => (
              <Link href={`/clients/${c.id}/invite-link`} className="card-group-item phase-waiting" key={c.id}>
                <div className="session-highlight">
                  <span className="session-highlight-value is-placeholder">未定</span>
                </div>
                <div className="session-details">
                  <div className="session-client">{clientLabel(c)} 様</div>
                  <p className="muted session-meta">
                    {c.pendingRequest.title}
                    {c.pendingRequest.rate && ` ・ ${rateLabel(c.pendingRequest.rate)}`}
                  </p>
                </div>
                <ChevronRight className="card-group-chevron" size={20} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="phase-section">
          <h2>実施予定の相談（{upcoming.length}件）</h2>
          <div className="card-group">
            {upcoming.map((s) => (
              <Link href={`/sessions/${s.id}`} className="card-group-item phase-upcoming" key={s.id}>
                <div className="session-highlight">
                  <span className="session-highlight-value">{sessionDateLabel(s.scheduledAt)}</span>
                  <span className="session-highlight-time">{sessionTimeRange(s)}</span>
                </div>
                <div className="session-details">
                  <div className="session-client">{clientLabel(clientById(s.clientId))} 様</div>
                  <p className="muted session-meta">{rateLabel(s.rate)}</p>
                  {cardMissingNote(s)}
                </div>
                <ChevronRight className="card-group-chevron" size={20} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {needsReview.length > 0 && (
        <section className="phase-section">
          <h2>要確認（{needsReview.length}件）</h2>
          <div className="card-group">
            {needsReview.map((s) => (
              <Link href={`/sessions/${s.id}/approve`} className="card-group-item phase-info" key={s.id}>
                <div className="session-highlight">
                  <span className="session-highlight-value">{s.fee?.total?.toLocaleString()}円</span>
                  <span className="session-highlight-time">{PAYMENT_ISSUE_LABEL[s.paymentStatus] ?? "要確認"}</span>
                </div>
                <div className="session-details">
                  <div className="session-client">{clientLabel(clientById(s.clientId))} 様</div>
                  <p className="muted session-meta">
                    {sessionDateLabel(s.scheduledAt)} {sessionTimeRange(s)}実施
                  </p>
                </div>
                <ChevronRight className="card-group-chevron" size={20} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {endedCount > 0 && (
        <details>
          <summary>終了済みの相談を表示（{endedCount}件）</summary>

          {trulyPending.length > 0 && (
            <section className="phase-section" style={{ marginTop: 16 }}>
              <h2>決済待ち（{trulyPending.length}件）</h2>
              <div className="card-group">
                {trulyPending.map((s) => (
                  <Link href={`/sessions/${s.id}/approve`} className="card-group-item phase-waiting" key={s.id}>
                    <div className="session-highlight">
                      <span className="session-highlight-value">{s.fee?.total?.toLocaleString()}円</span>
                      <span className="session-highlight-time">{PAYMENT_PENDING_LABEL[s.paymentStatus] ?? "処理中"}</span>
                    </div>
                    <div className="session-details">
                      <div className="session-client">{clientLabel(clientById(s.clientId))} 様</div>
                      <p className="muted session-meta">
                        {sessionDateLabel(s.scheduledAt)} {sessionTimeRange(s)}実施 ・ {rateLabel(s.rate)}
                      </p>
                    </div>
                    <ChevronRight className="card-group-chevron" size={20} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {paidToShow.length > 0 && (
            <section className="phase-section">
              <h2>決済済み</h2>
              <table>
                <tbody>
                  {paidToShow.map((s) => (
                    <tr key={s.id}>
                      <td>{clientLabel(clientById(s.clientId))} 様</td>
                      <td>{s.billableMinutes}分</td>
                      <td className="amount-cell">{s.fee?.total?.toLocaleString()}円</td>
                      <td className="muted">{s.paymentStatus ?? "-"}</td>
                      <td className="muted">{formatJstDate(s.approvedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </details>
      )}
    </main>
  );
}
