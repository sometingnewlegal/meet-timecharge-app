import Link from "next/link";
import { getSession, getClients } from "@/lib/store";
import { listRecentConferences, getConferenceForMeetingCode } from "@/lib/googleMeet";
import { calcFee } from "@/lib/feeCalc";
import { clientLabel as formatClientLabel } from "@/lib/clientLabel";
import { formatJstDateTime, formatJstHM } from "@/lib/weekDates";
import WithholdingConfirm from "./WithholdingConfirm";
import {
  selectCandidateAction,
  manualCandidateAction,
  resetCandidateAction,
  previewFinalizationAction,
  backToDeductionAction,
  finalizeApprovalAction,
  retryChargeAction,
} from "./actions";

const PAYMENT_STATUS_LABEL = {
  paid: "課金完了",
  no_charge: "0円のため課金なし",
  no_card: "カード未登録のため未課金",
  failed: "課金失敗",
  requires_action: "カードの追加認証が必要（顧客対応が必要）",
  processing: "処理中",
};

export default async function ApprovePage({ params }) {
  const { id } = await params;
  const session = await getSession(id);
  const client = (await getClients()).find((c) => c.id === session?.clientId);
  const clientLabel = formatClientLabel(client);
  const rate = session?.rate;

  if (!session) {
    return (
      <main>
        <p>相談記録が見つかりません。</p>
        <Link href="/">トップへ戻る</Link>
      </main>
    );
  }

  if (session.status === "approved") {
    const canRetry = session.paymentStatus === "no_card" || session.paymentStatus === "failed";
    // 金額確定済みでも、実際に課金が完了しているとは限らないため見出しを状態に合わせる
    const heading = canRetry ? "要確認" : session.paymentStatus === "paid" || session.paymentStatus === "no_charge" ? "決済済み" : "決済待ち";
    return (
      <main>
        <h1>{heading}</h1>
        <div className="card">
          <p>相談者: {clientLabel} 様</p>
          <p>請求対象時間: {session.billableMinutes}分（{session.fee.blocks}ブロック）</p>
          <p>合計: {session.fee.total.toLocaleString()}円（税別小計 {session.fee.subtotal.toLocaleString()}円 + 消費税 {session.fee.tax.toLocaleString()}円）</p>
          {session.withholdingApplied && (
            <p>
              源泉徴収額: {session.withholdingAmount.toLocaleString()}円／実際の課金額: {(session.fee.total - session.withholdingAmount).toLocaleString()}円
            </p>
          )}
          <p>
            決済状況: {PAYMENT_STATUS_LABEL[session.paymentStatus] ?? session.paymentStatus ?? "不明"}
          </p>
          {session.paymentError && <p className="muted">エラー詳細: {session.paymentError}</p>}
        </div>

        {session.paymentStatus === "no_card" && (
          <p className="muted">
            <Link href={`/clients/${client?.id}/invite-link`}>招待リンク</Link>
            から相談者ご本人にカードを登録していただいてから、下のボタンで再課金できます。
          </p>
        )}

        {canRetry && (
          <form action={retryChargeAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button type="submit">再課金を試す</button>
          </form>
        )}

        <p className="muted">
          <Link href="/sessions">一覧へ戻る</Link>
        </p>
      </main>
    );
  }

  // ステップ2b: 控除入力済み → 源泉徴収の有無を最終確認して確定・課金する
  if (session.billableMinutes !== null) {
    const suggestWithholding = !!client?.companyName;
    return (
      <main>
        <h1>金額の確認・源泉徴収</h1>
        <div className="card">
          <p>相談者: {clientLabel} 様</p>
          <p>請求対象時間: {session.billableMinutes}分（控除 {session.deductionMinutes}分）</p>
        </div>

        <WithholdingConfirm
          sessionId={session.id}
          fee={session.fee}
          suggestWithholding={suggestWithholding}
          action={finalizeApprovalAction}
          backAction={backToDeductionAction}
        />
      </main>
    );
  }

  // ステップ2a: 会議・参加者を選択済み → 控除を入力して試算する
  if (session.conferenceRecordName) {
    const previewMinutes = Math.max(0, (session.inRoomMinutes || 0) - (rate.freeMinutes || 0));
    const preview = calcFee(previewMinutes, rate);
    return (
      <main>
        <h1>控除の入力</h1>
        <div className="card">
          <p>相談者: {clientLabel} 様</p>
          <p>
            単価: {rate.unitMinutes}分あたり{rate.pricePerUnit.toLocaleString()}円（税別）
            {rate.freeMinutes > 0 && `／最初の${rate.freeMinutes}分は無料`}
          </p>
          <p>在室時間: {session.inRoomMinutes}分（{session.participantName}）</p>
        </div>

        {session.transcriptAvailable ? (
          <p className="muted">
            文字起こしから自動算出: 最初の発言開始〜入室、最後の発言〜退室の合計 約{session.suggestedDeductionMinutes}分を
            控除の初期値にしています。必要なら書き換えてください。
          </p>
        ) : (
          <p className="muted">この回は文字起こしが利用できなかったため、控除は手動で入力してください（初期値0分）。</p>
        )}

        <form action={previewFinalizationAction} className="card">
          <input type="hidden" name="sessionId" value={session.id} />
          <label>
            控除（分）— 資料待ち等、明らかに相談と無関係な時間があれば入力
            <input
              type="number"
              name="deductionMinutes"
              min="0"
              step="0.1"
              defaultValue={session.suggestedDeductionMinutes || 0}
            />
          </label>
          <p className="muted">
            参考: 控除0分の場合 → {preview.blocks}ブロック / 合計 {preview.total.toLocaleString()}円
            （控除を入力すると、次の確認画面でその分を引いて再計算されます{rate.freeMinutes > 0 && `。最初の${rate.freeMinutes}分の無料分は既に引いた金額です`}）
          </p>
          <button type="submit">次へ（確認画面へ）</button>
        </form>

        <form action={resetCandidateAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button type="submit" className="secondary">選び直す</button>
        </form>
      </main>
    );
  }

  // ステップ1: どの会議・参加者を対象にするか選ぶ
  // meetingCodeがあれば予約時に発行したMeetリンクそのものを直接参照できるため、時刻推測は不要
  let conferences = [];
  let fetchError = null;
  try {
    if (session.meetingCode) {
      const conf = await getConferenceForMeetingCode(session.meetingCode);
      conferences = conf ? [conf] : [];
    } else {
      const sinceIso = new Date(new Date(session.scheduledAt).getTime() - 15 * 60 * 1000).toISOString();
      conferences = await listRecentConferences(sinceIso);
    }
  } catch (err) {
    fetchError = err?.message || String(err);
  }

  return (
    <main>
      <h1>対象の会議を選択</h1>
      <div className="card">
        <p>相談者: {clientLabel} 様</p>
        <p className="muted">予定日時: {formatJstDateTime(session.scheduledAt)}</p>
      </div>

      {fetchError && (
        <p className="muted">Google Meet の会議記録取得でエラーが発生しました: {fetchError}</p>
      )}

      {conferences.length === 0 && !fetchError && (
        <p className="muted">
          該当する会議記録が見つかりませんでした（記録の反映に数分かかることがあります）。
          {session.meetingCode && "予約時に発行したMeetリンクで実際に話したかご確認ください。"}
        </p>
      )}

      {conferences.map((conf) => (
        <div className="card" key={conf.name}>
          <p className="muted">
            会議 {formatJstDateTime(conf.startTime)} 〜{" "}
            {conf.endTime ? formatJstHM(conf.endTime) : "(進行中)"}
            （全体 {conf.durationMinutes ?? "?"}分）
          </p>
          {conf.participants.map((p, i) => (
            <form action={selectCandidateAction} key={i} style={{ marginBottom: 8 }}>
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="conferenceRecordName" value={conf.name} />
              <input type="hidden" name="participantName" value={p.name} />
              <input type="hidden" name="inRoomMinutes" value={p.inRoomMinutes ?? 0} />
              <input type="hidden" name="earliestStartTime" value={p.earliestStartTime ?? ""} />
              <input type="hidden" name="latestEndTime" value={p.latestEndTime ?? ""} />
              <button type="submit" className="secondary">
                {p.name} — 在室 {p.inRoomMinutes ?? "?"}分 をこの相談として選択
              </button>
            </form>
          ))}
        </div>
      ))}

      <h2>見つからない場合は手動入力</h2>
      <form action={manualCandidateAction} className="card">
        <input type="hidden" name="sessionId" value={session.id} />
        <label>
          在室時間（分）
          <input type="number" name="manualMinutes" min="0" step="1" required />
        </label>
        <button type="submit">手動入力で進める</button>
      </form>
    </main>
  );
}
