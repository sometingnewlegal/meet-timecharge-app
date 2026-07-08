import Link from "next/link";
import { getRateTemplates } from "@/lib/store";
import { getBusyBlocks } from "@/lib/googleMeet";
import { todayJstDateStr, mondayOf, addDays } from "@/lib/weekDates";
import { createScheduleRequestAction } from "./actions";
import WeekPicker from "./WeekPicker";

export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }) {
  const templates = await getRateTemplates();
  const { week } = await searchParams;
  const monday = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayJstDateStr());
  const friday = addDays(monday, 4);
  const prevWeekHref = `/start?week=${addDays(monday, -7)}`;
  const nextWeekHref = `/start?week=${addDays(monday, 7)}`;

  let busy = [];
  let fetchError = null;
  try {
    busy = await getBusyBlocks(`${monday}T00:00:00+09:00`, `${friday}T23:59:59+09:00`);
  } catch (err) {
    fetchError = err?.message || String(err);
  }

  return (
    <main>
      <div className="nav">
        <Link href="/">トップ</Link>
      </div>
      <h1>相談日程の候補を送る</h1>
      <p className="muted">
        相談者の氏名やカード情報が無くても送れます（初回相談を想定）。
        ご自身のGoogleカレンダーの空き状況を見ながら、候補日時を最大5個まで選んで送れます。
        相談者はリンク上でその中から都合の良い日時を選び、決まるとMeetの予定が自動発行されます。
        続けて氏名・カード登録に進んでもらう流れです。
      </p>

      {fetchError && (
        <p className="muted">
          カレンダーの空き状況取得でエラーが発生しました（{fetchError}）。空き状況なしで候補を選べます。
        </p>
      )}

      <div className="nav">
        <Link href={prevWeekHref}>← 前の週</Link>
        <Link href={nextWeekHref}>次の週 →</Link>
      </div>

      <WeekPicker
        monday={monday}
        busy={busy}
        templates={templates}
        action={createScheduleRequestAction}
      />
    </main>
  );
}
