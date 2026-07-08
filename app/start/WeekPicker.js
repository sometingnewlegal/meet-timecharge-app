"use client";
import { Fragment, useMemo, useState } from "react";
import { addDays } from "@/lib/weekDates";

const MAX_CANDIDATES = 5;
const START_HOUR = 9;
const END_HOUR = 19; // この時刻の枠は含まない（最後の枠は18:30開始）
const SLOT_MINUTES = 30;
const DAY_LABELS = ["月", "火", "水", "木", "金"];

function buildSlots() {
  const slots = [];
  for (let mins = START_HOUR * 60; mins < END_HOUR * 60; mins += SLOT_MINUTES) {
    slots.push({ hour: Math.floor(mins / 60), minute: mins % 60 });
  }
  return slots;
}

function isoOf(dateStr, hour, minute) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${dateStr}T${pad(hour)}:${pad(minute)}:00+09:00`;
}

export default function WeekPicker({ monday, busy, templates, action }) {
  const [selected, setSelected] = useState([]); // ISO文字列の配列（選んだ順）

  const slots = useMemo(() => buildSlots(), []);
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(monday, i)),
    [monday]
  );
  const busyRanges = useMemo(
    () => (busy || []).map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() })),
    [busy]
  );
  const now = Date.now();

  function isBusy(iso) {
    const start = new Date(iso).getTime();
    const end = start + SLOT_MINUTES * 60 * 1000;
    return busyRanges.some((b) => start < b.end && end > b.start);
  }

  function toggle(iso) {
    setSelected((prev) => {
      if (prev.includes(iso)) return prev.filter((v) => v !== iso);
      if (prev.length >= MAX_CANDIDATES) return prev;
      return [...prev, iso];
    });
  }

  return (
    <form action={action} className="card">
      <p className="muted">
        空いている枠をクリックして候補にしてください（最大{MAX_CANDIDATES}個）。網掛けは既存の予定がある時間帯です。
      </p>

      <div
        className="week-grid"
        style={{ gridTemplateColumns: `44px repeat(${days.length}, 1fr)` }}
      >
        <div className="week-grid-header" style={{ borderLeft: "none" }} />
        {days.map((dateStr, i) => {
          const [, m, d] = dateStr.split("-");
          return (
            <div className="week-grid-header" key={dateStr}>
              {DAY_LABELS[i]} {Number(m)}/{Number(d)}
            </div>
          );
        })}

        {slots.map(({ hour, minute }) => (
          <Fragment key={`row-${hour}-${minute}`}>
            <div className="week-time-label">
              {minute === 0 ? `${hour}:00` : ""}
            </div>
            {days.map((dateStr) => {
              const iso = isoOf(dateStr, hour, minute);
              const past = new Date(iso).getTime() < now;
              const busySlot = !past && isBusy(iso);
              const idx = selected.indexOf(iso);
              const disabled = past || busySlot;
              const classes = ["week-cell"];
              if (busySlot) classes.push("busy");
              if (past) classes.push("past");
              if (idx !== -1) classes.push("selected");
              return (
                <button
                  type="button"
                  key={iso}
                  className={classes.join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(iso)}
                  title={new Date(iso).toLocaleString("ja-JP")}
                >
                  {idx !== -1 ? idx + 1 : ""}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      {selected.map((iso, i) => (
        <input key={iso} type="hidden" name={`candidate${i + 1}`} value={iso} />
      ))}

      <label>
        相談者のメールアドレス
        <input type="email" name="email" required placeholder="例: yamada@example.com" />
      </label>
      <label>
        相談の長さ
        <select name="durationMinutes" required defaultValue="30">
          <option value="15">15分</option>
          <option value="30">30分</option>
          <option value="45">45分</option>
          <option value="60">60分</option>
          <option value="90">90分</option>
          <option value="120">120分</option>
        </select>
      </label>
      <label>
        単価テンプレート
        <select name="rateTemplateId" required defaultValue={templates[0]?.id}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={selected.length === 0}>
        この内容で候補を送る（{selected.length}件選択中）
      </button>
    </form>
  );
}
