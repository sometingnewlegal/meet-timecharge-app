// 料金計算ロジック（タクシーメーター方式）。meet-timecharge/fee-calc.js と同じルール。
//   ・請求対象時間が単位時間（例:15分）を1秒でも超えるごとに次のブロックへ
//   ・消費税は税別小計に対して taxRate を掛け、1円未満切り捨て
export function calcFee(billableMinutes, template) {
  const minutes = Math.max(0, billableMinutes);
  const blocks = minutes === 0 ? 0 : Math.ceil(minutes / template.unitMinutes);
  const subtotal = blocks * template.pricePerUnit;
  const tax = Math.floor(subtotal * template.taxRate);
  const total = subtotal + tax;
  return { minutes, blocks, subtotal, tax, total };
}
