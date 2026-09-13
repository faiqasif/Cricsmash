"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatPlayDate } from "@/lib/team-of-the-day";

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function startOfTodayISO() {
  const now = new Date();
  return toISO(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

type TeamCalendarProps = {
  selected: string[];
  onChange: (dates: string[]) => void;
  minDate?: string;
  single?: boolean;
};

export function TeamCalendar({ selected, onChange, minDate, single = false }: TeamCalendarProps) {
  const min = minDate ?? startOfTodayISO();
  const firstSelected = selected[0];
  const initial = firstSelected ? new Date(`${firstSelected}T00:00:00Z`) : new Date();
  const [cursor, setCursor] = useState(
    () => new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1)),
  );

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null;
    return index - firstWeekday + 1;
  });

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function toggle(iso: string) {
    if (iso < min) return;
    if (single) {
      onChange([iso]);
      return;
    }
    if (selected.includes(iso)) {
      onChange(selected.filter((value) => value !== iso));
      return;
    }
    onChange([...selected, iso].sort());
  }

  return (
    <div>
      <div className="rounded-[28px] border border-white/8 bg-[#14141a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{monthLabel}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
              className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
              className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day} className="py-2 font-medium">
              {day}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />;
            const iso = toISO(year, month, day);
            const isSelected = selected.includes(iso);
            const disabled = iso < min;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => toggle(iso)}
                className={`mx-auto flex size-9 items-center justify-center rounded-full text-sm ${
                  isSelected
                    ? "bg-purple font-semibold text-white"
                    : disabled
                      ? "text-zinc-600"
                      : "text-zinc-200 hover:bg-white/5"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-white">Selected Dates</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((iso) => {
              const date = formatPlayDate(iso);
              return (
                <span
                  key={iso}
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple/20 px-3 py-1.5 text-xs font-medium text-purple"
                >
                  {date.label} ({date.weekday})
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((value) => value !== iso))}
                    className="rounded-full p-0.5 hover:bg-white/10"
                    aria-label={`Remove ${date.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
