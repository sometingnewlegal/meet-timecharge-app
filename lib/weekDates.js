// 日付計算はすべて「カレンダー上の日付」として扱い、時刻はJST（+09:00）固定で組み立てる
// （実行環境（サーバーはUTC、ブラウザはJST）によってDateのローカルタイムゾーンが変わるのに依存させない）

export function todayJstDateStr() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=日, 1=月, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
