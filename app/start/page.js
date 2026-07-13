import HomeLink from "@/components/HomeLink";
import { getBusyEvents } from "@/lib/googleMeet";
import { getRateTemplates } from "@/lib/store";
import { todayJstDateStr, mondayOf, addDays } from "@/lib/weekDates";
import { createScheduleRequestAction } from "./actions";
import WeekPicker from "./WeekPicker";

export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }) {
  const { week } = await searchParams;
  const monday = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayJstDateStr());
  const friday = addDays(monday, 4);
  const prevWeekHref = `/start?week=${addDays(monday, -7)}`;
  const nextWeekHref = `/start?week=${addDays(monday, 7)}`;

  const rateTemplates = await getRateTemplates();

  let busy = [];
  let fetchError = null;
  try {
    busy = await getBusyEvents(`${monday}T00:00:00+09:00`, `${friday}T23:59:59+09:00`);
  } catch (err) {
    fetchError = err?.message || String(err);
  }

  return (
    <main>
      <HomeLink />
      <h1>新規作成</h1>

      {fetchError && (
        <p className="muted">
          カレンダーの空き状況取得でエラーが発生しました（{fetchError}）。空き状況なしで候補を選べます。
        </p>
      )}

      <WeekPicker
        monday={monday}
        busy={busy}
        rateTemplates={rateTemplates}
        action={createScheduleRequestAction}
        prevWeekHref={prevWeekHref}
        nextWeekHref={nextWeekHref}
      />
    </main>
  );
}
