"use client";
import { Fragment, useMemo, useState } from "react";
import { addDays } from "@/lib/weekDates";

const MAX_CANDIDATES = 5;
const START_HOUR = 9;
const END_HOUR = 19; // この時刻以降には新しい枠を作らない
const DAY_LABELS = ["月", "火", "水", "木", "金"];

function buildSlots(stepMinutes) {
  const slots = [];
  for (let mins = START_HOUR * 60; mins < END_HOUR * 60; mins += stepMinutes) {
    slots.push({ hour: Math.floor(mins / 60), minute: mins % 60 });
  }
  return slots;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoOf(dateStr, hour, minute) {
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}:00+09:00`;
}

function formatHM(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export default function WeekPicker({ monday, busy, action }) {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selected, setSelected] = useState([]); // ISO文字列の配列（選んだ順）

  const slots = useMemo(() => buildSlots(durationMinutes), [durationMinutes]);
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
    const end = start + durationMinutes * 60 * 1000;
    return busyRanges.some((b) => start < b.end && end > b.start);
  }

  function toggle(iso) {
    setSelected((prev) => {
      if (prev.includes(iso)) return prev.filter((v) => v !== iso);
      if (prev.length >= MAX_CANDIDATES) return prev;
      return [...prev, iso];
    });
  }

  function handleDurationChange(e) {
    setDurationMinutes(Number(e.target.value));
    setSelected([]); // 相談時間が変わると枠の区切りが変わるため、選び直してもらう
  }

  return (
    <form action={action} className="card">
      <label>
        相談時間
        <select name="durationMinutes" required value={durationMinutes} onChange={handleDurationChange}>
          <option value="15">15分</option>
          <option value="30">30分</option>
          <option value="45">45分</option>
          <option value="60">60分</option>
          <option value="90">90分</option>
          <option value="120">120分</option>
        </select>
      </label>

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
              <div>{Number(m)}/{Number(d)}</div>
              <div>{DAY_LABELS[i]}</div>
            </div>
          );
        })}

        {slots.map(({ hour, minute }) => (
          <Fragment key={`row-${hour}-${minute}`}>
            <div className="week-time-label">
              {formatHM(hour, minute)}
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
              const endTotal = hour * 60 + minute + durationMinutes;
              const rangeLabel = `${formatHM(hour, minute)}~${formatHM(Math.floor(endTotal / 60) % 24, endTotal % 60)}`;
              return (
                <button
                  type="button"
                  key={iso}
                  className={classes.join(" ")}
                  disabled={disabled}
                  onClick={() => toggle(iso)}
                  title={rangeLabel}
                >
                  {idx !== -1 ? rangeLabel : ""}
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
        単価（◯分あたり◯円）
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select name="unitMinutes" required defaultValue="15" style={{ width: "auto" }}>
            <option value="15">15分</option>
            <option value="30">30分</option>
            <option value="45">45分</option>
            <option value="60">60分</option>
          </select>
          <span>あたり</span>
          <input
            type="number"
            name="pricePerUnit"
            required
            min="0"
            step="1"
            defaultValue="3500"
            style={{ width: "auto", flex: 1 }}
          />
          <span>円（税別）</span>
        </div>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" name="freeFirst30" style={{ width: "auto", margin: 0 }} />
        最初の30分は無料にする（実際の相談時間から30分を引いて課金します）
      </label>

      <button type="submit" disabled={selected.length === 0}>
        この内容で候補を送る（{selected.length}件選択中）
      </button>
    </form>
  );
}
