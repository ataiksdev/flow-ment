import { useState, useMemo } from "react";
import { format, addDays, subDays, parseISO, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimeEntries, useCategories, useSettings } from "@/hooks/useDB";
import { EditEntryDrawer } from "@/components/EditEntryDrawer";
import type { TimeEntry } from "@/lib/db";

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
        {/* Day nav row */}
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

        {/* Day progress bar — sharp Bauhaus stripe */}
        <div className="px-4 pb-3">
          <div className="relative h-2 w-full bg-muted border border-border overflow-hidden">
            {isToday && (
              <div
                className="absolute left-0 top-0 h-full bg-primary transition-all duration-1000"
                style={{ width: `${dayProgressPct}%` }}
              />
            )}
            {!isToday && dateStr < format(now, "yyyy-MM-dd") && (
              <div className="absolute inset-0 bg-muted-foreground/25" />
            )}
          </div>
          {isToday && (
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground/60">00:00</span>
              <span className="text-[9px] font-mono font-bold text-primary">
                {format(now, "HH:mm")} · {Math.round(dayProgressPct)}%
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60">24:00</span>
            </div>
          )}
        </div>
      </header>

      {/* 4×6 Hour Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-[2px] bg-border border border-border">
          {hours.map((hour) => {
            const isCurrentHour = isToday && hour === nowHour;
            const hourEntries = entries
              .map((e) => {
                const seg = entrySegmentForHour(e, hour);
                if (!seg) return null;
                const cat = categories.find((c) => c.id === e.categoryId);
                return { entry: e, seg, cat };
              })
              .filter(
                Boolean
              ) as {
                entry: TimeEntry;
                seg: { topPct: number; heightPct: number };
                cat: (typeof categories)[0] | undefined;
              }[];

            return (
              <div
                key={hour}
                className="relative bg-card overflow-hidden"
                style={{ height: 72 }}
              >
                {/* Diagonal hatch on active hour — Bauhaus texture */}
                {isCurrentHour && (
                  <div className="absolute inset-0 bauhaus-hatch opacity-60 pointer-events-none" />
                )}

                {/* Hour label */}
                <span
                  className={`absolute top-1.5 left-2 text-[10px] font-mono font-bold z-10 leading-none ${
                    isCurrentHour ? "text-primary" : "text-muted-foreground/40"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </span>

                {/* Entry segments */}
                {hourEntries.map(({ entry, seg, cat }, idx) => (
                  <div
                    key={`${entry.id}-${hour}`}
                    onClick={() => setEditingEntry(entry)}
                    className="absolute cursor-pointer hover:brightness-95 active:brightness-90 transition-all z-10"
                    style={{
                      top: `${seg.topPct}%`,
                      height: `${seg.heightPct}%`,
                      left: idx > 0 ? `${idx * 22}%` : 0,
                      right: 0,
                      backgroundColor: cat?.color ?? "#aaa",
                      opacity: 0.9,
                    }}
                    title={entry.description || cat?.name}
                  >
                    {seg.heightPct > 28 && (
                      <span className="absolute inset-x-1 top-0.5 text-[8px] font-bold text-white truncate leading-tight">
                        {entry.description || cat?.name}
                      </span>
                    )}
                  </div>
                ))}

                {/* Current-time hairline */}
                {isCurrentHour && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-primary z-20 pointer-events-none"
                    style={{ top: `${(nowMin / 60) * 100}%` }}
                  >
                    <span
                      className="absolute left-0 -top-1 w-2 h-2 bg-primary"
                      style={{ borderRadius: "50%" }}
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

      {/* Footer Day Summary */}
      <div className="flex-shrink-0 bg-card border-t-2 border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bauhaus-section-rule">
            Day Summary
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {activeHours}h window
          </span>
        </div>
        {/* Segmented bar — sharp Bauhaus blocks */}
        <div className="h-3 w-full bg-muted border border-border overflow-hidden flex">
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
          <div className="flex gap-3 mt-2 overflow-x-auto no-scrollbar">
            {categoryTotals.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 shrink-0">
                {/* Square swatch — Bauhaus */}
                <span
                  className="w-2 h-2 flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
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
