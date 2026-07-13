"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays } from "@/lib/weekDates";

const MAX_CANDIDATES = 5;
const START_HOUR = 9;
const END_HOUR = 19; // この時刻以降には新しい枠を作らない
const DAY_LABELS = ["月", "火", "水", "木", "金"];
const CELL_HEIGHT = 26; // 1枠の高さ(px)。既存予定の帯の位置計算にも使うのでCSSの.week-cellと揃えること

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

export default function WeekPicker({ monday, busy, rateTemplates = [], action, prevWeekHref, nextWeekHref }) {
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selected, setSelected] = useState([]); // ISO文字列の配列（選んだ順）
  const [formValid, setFormValid] = useState(false); // 候補以外の必須項目が揃っているか
  const formRef = useRef(null);
  const unitMinutesRef = useRef(null);
  const pricePerUnitRef = useRef(null);

  function handleFormChange(e) {
    setFormValid(e.currentTarget.checkValidity());
  }

  // テンプレ選択は単価欄への自動入力のみ行う「補助」機能（選ばなくても自由入力で送信できる）
  function handleTemplateSelect(e) {
    const template = rateTemplates.find((t) => String(t.id) === e.target.value);
    if (!template) return;
    if (unitMinutesRef.current) unitMinutesRef.current.value = String(template.unitMinutes);
    if (pricePerUnitRef.current) pricePerUnitRef.current.value = String(template.pricePerUnit);
    if (formRef.current) setFormValid(formRef.current.checkValidity());
  }

  const canSubmit = formValid && selected.length > 0;

  const slots = useMemo(() => buildSlots(durationMinutes), [durationMinutes]);
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(monday, i)),
    [monday]
  );
  const busyRanges = useMemo(
    () => (busy || []).map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
      summary: b.summary,
    })),
    [busy]
  );
  const now = Date.now();

  function findBusyEvent(iso) {
    const start = new Date(iso).getTime();
    const end = start + durationMinutes * 60 * 1000;
    return busyRanges.find((b) => start < b.end && end > b.start) || null;
  }

  // 既存予定をGoogleカレンダー風の「1つの帯」として表示するための位置計算。
  // グリッドの表示範囲(9:00〜19:00)にかかる部分だけを、その日の列内のpx位置に変換する
  function bandsForDay(dateStr) {
    const dayStart = new Date(`${dateStr}T00:00:00+09:00`).getTime();
    const gridStartMin = START_HOUR * 60;
    const gridEndMin = END_HOUR * 60;
    const pxPerMin = CELL_HEIGHT / durationMinutes;
    const bands = [];
    for (const b of busyRanges) {
      const rawStartMin = (b.start - dayStart) / 60000;
      const rawEndMin = (b.end - dayStart) / 60000;
      if (rawEndMin <= gridStartMin || rawStartMin >= gridEndMin) continue;
      const startMin = Math.max(rawStartMin, gridStartMin);
      const endMin = Math.min(rawEndMin, gridEndMin);
      bands.push({
        top: (startMin - gridStartMin) * pxPerMin,
        height: (endMin - startMin) * pxPerMin,
        summary: b.summary,
        timeLabel: `${formatHM(Math.floor(startMin / 60), Math.round(startMin % 60))}~${formatHM(Math.floor(endMin / 60) % 24, Math.round(endMin % 60))}`,
      });
    }
    return bands;
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
    <form ref={formRef} action={action} className="card" onChange={handleFormChange} onInput={handleFormChange}>
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
        空いている枠をクリックして候補にしてください（最大{MAX_CANDIDATES}個）。
      </p>

      <div className="week-nav">
        <Link href={prevWeekHref}>← 前の週</Link>
        <Link href={nextWeekHref}>次の週 →</Link>
      </div>
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

        <div className="week-time-col">
          {slots.map(({ hour, minute }) => (
            <div className="week-time-label" key={`t-${hour}-${minute}`}>
              {formatHM(hour, minute)}
            </div>
          ))}
        </div>
        {days.map((dateStr) => (
          <div className="week-day-col" key={dateStr}>
            {slots.map(({ hour, minute }) => {
              const iso = isoOf(dateStr, hour, minute);
              const past = new Date(iso).getTime() < now;
              const busyEvent = !past ? findBusyEvent(iso) : null;
              const idx = selected.indexOf(iso);
              const disabled = past || !!busyEvent;
              const classes = ["week-cell"];
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
                  title={busyEvent ? `${rangeLabel} ${busyEvent.summary}` : rangeLabel}
                >
                  {idx !== -1 ? rangeLabel : ""}
                </button>
              );
            })}
            {bandsForDay(dateStr).map((band, i) => (
              <div
                className="week-event-band"
                key={`band-${i}`}
                style={{ top: band.top + 2, height: Math.max(band.height - 4, 8) }}
                title={`${band.timeLabel} ${band.summary}`}
              >
                {band.summary}
                <span className="week-event-time">{band.timeLabel}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selected.map((iso, i) => (
        <input key={iso} type="hidden" name={`candidate${i + 1}`} value={iso} />
      ))}

      <label>
        予定の名称（カレンダーに表示される予定名になります）
        <input type="text" name="title" required placeholder="例: 山田様 タイムチャージ相談" />
      </label>
      {rateTemplates.length > 0 && (
        <label>
          よく使う単価から選ぶ（任意・単価欄に自動入力されます）
          <select defaultValue="" onChange={handleTemplateSelect}>
            <option value="">（自由入力）</option>
            {rateTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.unitMinutes}分あたり{t.pricePerUnit.toLocaleString()}円
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        単価（◯分あたり◯円）
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select name="unitMinutes" required defaultValue="15" ref={unitMinutesRef} style={{ width: "auto" }}>
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
            ref={pricePerUnitRef}
            style={{ width: "auto", flex: 1 }}
          />
          <span>円（税別）</span>
        </div>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" name="freeFirst30" style={{ width: "auto", margin: 0 }} />
        最初の30分は無料にする（実際の相談時間から30分を引いて課金します）
      </label>

      <button type="submit" disabled={!canSubmit}>
        この内容で候補を送る（{selected.length}件選択中）
      </button>
    </form>
  );
}
