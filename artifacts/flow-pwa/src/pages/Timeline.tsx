import { useState, useMemo } from "react";
import { format, addDays, subDays, parseISO, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimeEntries, useCategories, useSettings } from "@/hooks/useDB";
import { EditEntryDrawer } from "@/components/EditEntryDrawer";
import type { TimeEntry } from "@/lib/db";

// Colour tint for each time-of-day period (matches CSS variables in index.css)
function getHourBg(hour: number): string {
  if (hour >= 21 || hour < 5) return "var(--hour-night)";
  if (hour >= 5 && hour < 8)  return "var(--hour-dawn)";
  if (hour >= 8 && hour < 13) return "var(--hour-morning)";
  if (hour >= 13 && hour < 18) return "var(--hour-afternoon)";
  return "var(--hour-evening)";
}

function entrySegmentForHour(entry: TimeEntry, hour: number) {
  const start = parseISO(entry.startTime);
  const end = parseISO(entry.endTime);
  const startHour = start.getHours();
  const endHour = end.getHours();
  const endMin = end.getMinutes();

  if (hour < startHour || hour > endHour) return null;
  if (hour === endHour && endMin === 0) return null;

  const cellStartMin = hour === startHour ? start.getMinutes() : 0;
  const cellEndMin = hour === endHour ? endMin : 60;
  if (cellEndMin <= cellStartMin) return null;

  return {
    topPct: (cellStartMin / 60) * 100,
    heightPct: ((cellEndMin - cellStartMin) / 60) * 100,
  };
}

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const entries = useTimeEntries(dateStr);
  const categories = useCategories();
  const settings = useSettings();

  const navigateDay = (dir: number) => {
    setCurrentDate((prev) => (dir > 0 ? addDays(prev, 1) : subDays(prev, 1)));
  };

  const now = new Date();
  const isToday = dateStr === format(now, "yyyy-MM-dd");
  const isPast = dateStr < format(now, "yyyy-MM-dd");
  const nowHour = now.getHours();
  const nowMin = now.getMinutes();
  const dayProgressPct = isToday ? ((nowHour * 60 + nowMin) / (24 * 60)) * 100 : 0;

  const wakeStartStr = settings.wakeStart || "07:00";
  const wakeEndStr = settings.wakeEnd || "23:00";
  const wakeStartH = parseInt(wakeStartStr.split(":")[0]);
  const wakeEndH = parseInt(wakeEndStr.split(":")[0]);
  const activeHours = Math.max(1, wakeEndH - wakeStartH);
  const activeMinutes = activeHours * 60;

  const categoryTotals = useMemo(() => {
    return categories
      .map((cat) => {
        const mins = entries
          .filter((e) => e.categoryId === cat.id)
          .reduce(
            (acc, e) =>
              acc + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)),
            0
          );
        return {
          ...cat,
          minutes: mins,
          percentage: Math.min(100, (mins / activeMinutes) * 100),
        };
      })
      .filter((c) => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [categories, entries, activeMinutes]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b-2 border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={() => navigateDay(-1)}
            className="w-9 h-9 flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="font-bold text-xl tracking-tight leading-tight uppercase">
              {format(currentDate, "EEEE")}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
              {format(currentDate, "MMM d")}
            </p>
          </div>

          <button
            onClick={() => navigateDay(1)}
            className="w-9 h-9 flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day progress bar */}
        <div className="px-4 pb-3">
          <div className="relative h-2 w-full border border-border overflow-hidden" style={{ backgroundColor: "var(--hour-night)" }}>
            {/* Colour segments by time period across the bar */}
            <div className="absolute inset-0 flex">
              {[
                { pct: 5/24*100, color: "var(--hour-night)" },
                { pct: 3/24*100, color: "var(--hour-dawn)" },
                { pct: 5/24*100, color: "var(--hour-morning)" },
                { pct: 5/24*100, color: "var(--hour-afternoon)" },
                { pct: 4/24*100, color: "var(--hour-evening)" },
                { pct: 2/24*100, color: "var(--hour-night)" },
              ].map((seg, i) => (
                <div key={i} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
              ))}
            </div>
            {/* Progress overlay */}
            {isToday && (
              <div
                className="absolute left-0 top-0 h-full bg-foreground/20 transition-all duration-1000"
                style={{ width: `${dayProgressPct}%` }}
              />
            )}
            {/* Current time tick */}
            {isToday && (
              <div
                className="absolute top-0 h-full w-[3px] bg-primary z-10"
                style={{ left: `${dayProgressPct}%` }}
              />
            )}
            {isPast && (
              <div className="absolute inset-0 bg-muted-foreground/30" />
            )}
          </div>
          {isToday && (
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground/50">00:00</span>
              <span className="text-[9px] font-mono font-bold text-primary">
                {format(now, "HH:mm")} · {Math.round(dayProgressPct)}%
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50">24:00</span>
            </div>
          )}
        </div>
      </header>

      {/* 4×6 Hour Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-[2px]" style={{ background: "hsl(var(--border))" }}>
          {hours.map((hour) => {
            const isCurrentHour = isToday && hour === nowHour;
            const isElapsed = isToday && hour < nowHour;
            // Past entire day = all hours elasped
            const cellIsElapsed = isPast || isElapsed;

            const hourEntries = entries
              .map((e) => {
                const seg = entrySegmentForHour(e, hour);
                if (!seg) return null;
                const cat = categories.find((c) => c.id === e.categoryId);
                return { entry: e, seg, cat };
              })
              .filter(Boolean) as {
                entry: TimeEntry;
                seg: { topPct: number; heightPct: number };
                cat: (typeof categories)[0] | undefined;
              }[];

            const bgColor = getHourBg(hour);

            return (
              <div
                key={hour}
                className="relative overflow-hidden transition-all"
                style={{
                  height: isCurrentHour ? 88 : 72,
                  backgroundColor: bgColor,
                  // Past hours: fade to gray
                  filter: cellIsElapsed ? "grayscale(0.6)" : undefined,
                  opacity: cellIsElapsed ? 0.45 : 1,
                  // Current hour: strong border highlight
                  outline: isCurrentHour ? "2px solid hsl(var(--primary))" : undefined,
                  outlineOffset: isCurrentHour ? "-2px" : undefined,
                  zIndex: isCurrentHour ? 2 : undefined,
                }}
              >
                {/* Hour label */}
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 8,
                    fontSize: isCurrentHour ? 13 : 10,
                    fontFamily: "Space Mono, monospace",
                    fontWeight: 700,
                    color: isCurrentHour
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground))",
                    opacity: cellIsElapsed ? 0.6 : isCurrentHour ? 1 : 0.5,
                    zIndex: 10,
                    lineHeight: 1,
                  }}
                >
                  {String(hour).padStart(2, "0")}
                </span>

                {/* Entry segments */}
                {hourEntries.map(({ entry, seg, cat }, idx) => (
                  <div
                    key={`${entry.id}-${hour}`}
                    onClick={() => setEditingEntry(entry)}
                    className="absolute cursor-pointer hover:brightness-105 active:brightness-90 transition-all z-10"
                    style={{
                      top: `${seg.topPct}%`,
                      height: `${seg.heightPct}%`,
                      left: idx > 0 ? `${idx * 22}%` : 0,
                      right: 0,
                      backgroundColor: cat?.color ?? "#aaa",
                      opacity: cellIsElapsed ? 0.7 : 1,
                    }}
                    title={entry.description || cat?.name}
                  >
                    {seg.heightPct > 25 && (
                      <span
                        style={{
                          position: "absolute",
                          inset: "0 4px",
                          top: 2,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "#fff",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          lineHeight: "1.1",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {entry.description || cat?.name}
                      </span>
                    )}
                  </div>
                ))}

                {/* Current-time hairline */}
                {isCurrentHour && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{
                      top: `${(nowMin / 60) * 100}%`,
                      height: 2,
                      backgroundColor: "hsl(var(--primary))",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: -3,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "hsl(var(--primary))",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Entry Drawer */}
      <EditEntryDrawer entry={editingEntry} onClose={() => setEditingEntry(null)} />

      {/* Day Summary strip */}
      <div className="flex-shrink-0 bg-card border-t-2 border-border px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest bauhaus-section-rule">
            Day
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">{activeHours}h window</span>
        </div>
        <div className="h-2 w-full border border-border overflow-hidden flex" style={{ backgroundColor: "hsl(var(--muted))" }}>
          {categoryTotals.map((cat) => (
            <div
              key={cat.id}
              className="h-full transition-all duration-500"
              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
              title={`${cat.name}: ${Math.round(cat.percentage)}%`}
            />
          ))}
        </div>
        {categoryTotals.length > 0 && (
          <div className="flex gap-3 mt-1.5 overflow-x-auto no-scrollbar">
            {categoryTotals.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[9px] font-bold uppercase tracking-wide text-foreground">
                  {cat.name} · {Math.round((cat.minutes / 60) * 10) / 10}h
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
