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

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// 保存済みのISO時刻（UTC）をJSTの年月日時分に分解する。
// 実行環境（サーバーはUTC、ブラウザはJST）のローカルタイムゾーンには依存させない。
export function toJstParts(iso) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: WEEKDAY_LABELS[d.getUTCDay()],
  };
}

export function formatJstHM(iso) {
  const { hour, minute } = toJstParts(iso);
  return `${pad2(hour)}:${pad2(minute)}`;
}

// 例: "2026/7/9"
export function formatJstDate(iso) {
  const { year, month, day } = toJstParts(iso);
  return `${year}/${month}/${day}`;
}

// 例: "2026/7/9 09:00"
export function formatJstDateTime(iso) {
  return `${formatJstDate(iso)} ${formatJstHM(iso)}`;
}

// 例: "7/9(木) 09:00~10:00"
export function formatJstRange(startIso, durationMinutes) {
  const start = toJstParts(startIso);
  return `${start.month}/${start.day}(${start.weekday}) ${formatJstHM(startIso)}~${formatJstEndHM(startIso, durationMinutes)}`;
}

// 開始時刻+所要時間から終了時刻だけを "09:00" 形式で取り出す
export function formatJstEndHM(startIso, durationMinutes) {
  const endIso = new Date(new Date(startIso).getTime() + durationMinutes * 60 * 1000).toISOString();
  return formatJstHM(endIso);
}
