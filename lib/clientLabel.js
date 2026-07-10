// 顧客の表示名（氏名 > メール > 不明、の優先順位）を1箇所にまとめる。
// 複数のページで同じ優先順位ロジックがコピーされていたのを統一するため。
export function clientLabel(client) {
  return client?.name || client?.email || "(不明)";
}
