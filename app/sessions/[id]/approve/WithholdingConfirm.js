"use client";
import { useState } from "react";
import { calcWithholding } from "@/lib/feeCalc";

// 源泉徴収の有無を弁護士自身が最終確認してから確定・課金するための画面。
// チェックボックスの初期値は呼び出し側（会社名の有無）からのサジェストだが、ここで自由に上書きできる。
export default function WithholdingConfirm({ sessionId, fee, suggestWithholding, action, backAction }) {
  const [withholdingApplied, setWithholdingApplied] = useState(suggestWithholding);
  const withholdingAmount = withholdingApplied ? calcWithholding(fee.subtotal) : 0;
  const chargeAmount = fee.total - withholdingAmount;

  return (
    <div className="card">
      <p>
        税別小計: {fee.subtotal.toLocaleString()}円／消費税: {fee.tax.toLocaleString()}円／合計: {fee.total.toLocaleString()}円
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          style={{ width: "auto", margin: 0 }}
          checked={withholdingApplied}
          onChange={(e) => setWithholdingApplied(e.target.checked)}
        />
        源泉徴収する（相談者が法人・個人事業者の場合。私的な個人への請求では通常不要です）
      </label>
      {withholdingApplied && (
        <p className="muted">
          源泉徴収額（税別小計の10.21%）: {withholdingAmount.toLocaleString()}円。
          この分を差し引いて課金し、源泉徴収分は相談者側で別途納付いただく前提です。
        </p>
      )}
      <p>
        <strong>実際にカード課金する金額: {chargeAmount.toLocaleString()}円</strong>
      </p>

      <form action={action}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="withholdingApplied" value={withholdingApplied ? "on" : "off"} />
        <button type="submit">この内容に同意し、確定・課金する</button>
      </form>
      <form action={backAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <button type="submit" className="secondary">控除をやり直す</button>
      </form>
    </div>
  );
}
