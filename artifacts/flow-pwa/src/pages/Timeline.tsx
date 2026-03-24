import { useState, useMemo } from "react";
import { format, addDays, subDays, parseISO, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimeEntries, useCategories, useSettings } from "@/hooks/useDB";
import { EditEntryDrawer } from "@/components/EditEntryDrawer";
import type { TimeEntry } from "@/lib/db";

// Returns the segment of an entry that falls within a given hour (0–23).
// Returns null if the entry doesn't overlap that hour.
function entrySegmentForHour(entry: TimeEntry, hour: number) {
  const start = parseISO(entry.startTime);
  const end = parseISO(entry.endTime);
  const startHour = start.getHours();
  const endHour = end.getHours();
  const endMin = end.getMinutes();

  if (hour < startHour || hour > endHour) return null;
  if (hour === endHour && endMin === 0) return null; // ends exactly on the hour, belongs to prev cell

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

  // Day progress (0–1 based on full 24h)
  const dayProgressPct = isToday ? ((nowHour * 60 + nowMin) / (24 * 60)) * 100 : 0;

  // Waking hours for day summary
  const wakeStartStr = settings.wakeStart || "07:00";
  const wakeEndStr = settings.wakeEnd || "23:00";
  const wakeStartH = parseInt(wakeStartStr.split(":")[0]);
  const wakeEndH = parseInt(wakeEndStr.split(":")[0]);
  const activeHours = Math.max(1, wakeEndH - wakeStartH);
  const activeMinutes = activeHours * 60;

  // Category totals for day summary bar
  const categoryTotals = useMemo(() => {
    return categories
      .map((cat) => {
        const mins = entries
          .filter((e) => e.categoryId === cat.id)
          .reduce((acc, e) => acc + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)), 0);
        return { ...cat, minutes: mins, percentage: Math.min(100, (mins / activeMinutes) * 100) };
      })
      .filter((c) => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [categories, entries, activeMinutes]);

  // Hours grid: 24 hours arranged as 4 cols × 6 rows
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateDay(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-serif font-bold text-lg leading-tight">
              {format(currentDate, "EEEE")}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
              {format(currentDate, "MMM d")}
            </p>
          </div>
          <button onClick={() => navigateDay(1)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Progress Bar */}
        <div className="relative">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            {isToday && (
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-1000"
                style={{ width: `${dayProgressPct}%` }}
              />
            )}
            {!isToday && dateStr < format(now, "yyyy-MM-dd") && (
              <div className="h-full w-full bg-muted-foreground/20 rounded-full" />
            )}
          </div>
          {isToday && (
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-mono text-muted-foreground/60">00:00</span>
              <span className="text-[9px] font-mono text-primary/70 font-semibold">
                {format(now, "HH:mm")} · {Math.round(dayProgressPct)}%
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60">24:00</span>
            </div>
          )}
        </div>
      </header>

      {/* 4×6 Hour Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-4 gap-1.5">
          {hours.map((hour) => {
            const isCurrentHour = isToday && hour === nowHour;
            const hourEntries = entries
              .map((e) => {
                const seg = entrySegmentForHour(e, hour);
                if (!seg) return null;
                const cat = categories.find((c) => c.id === e.categoryId);
                return { entry: e, seg, cat };
              })
              .filter(Boolean) as { entry: TimeEntry; seg: { topPct: number; heightPct: number }; cat: typeof categories[0] | undefined }[];

            return (
              <div
                key={hour}
                className="relative rounded-xl overflow-hidden border border-border/60"
                style={{ height: 72 }}
              >
                {/* Hour background — plain/muted, no highlight by default */}
                <div className="absolute inset-0 bg-card" />

                {/* Hour label */}
                <span
                  className={`absolute top-1.5 left-2 text-[10px] font-mono font-semibold z-10 leading-none ${
                    isCurrentHour ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </span>

                {/* Entry segments — stacked if multiple overlap */}
                {hourEntries.map(({ entry, seg, cat }, idx) => (
                  <div
                    key={`${entry.id}-${hour}`}
                    onClick={() => setEditingEntry(entry)}
                    className="absolute left-0 right-0 cursor-pointer hover:brightness-95 active:brightness-90 transition-all z-10"
                    style={{
                      top: `${seg.topPct}%`,
                      height: `${seg.heightPct}%`,
                      backgroundColor: cat?.color ?? "#aaa",
                      opacity: 0.88,
                      // If multiple entries overlap same hour, offset slightly
                      left: idx > 0 ? `${idx * 25}%` : 0,
                      right: 0,
                      borderRadius: 0,
                    }}
                    title={entry.description || cat?.name}
                  >
                    {/* Label only when tall enough */}
                    {seg.heightPct > 30 && (
                      <span className="absolute inset-x-1 top-0.5 text-[8px] font-bold text-white/90 truncate leading-tight">
                        {entry.description || cat?.name}
                      </span>
                    )}
                  </div>
                ))}

                {/* Current-time hairline within this hour cell */}
                {isCurrentHour && (
                  <div
                    className="absolute left-0 right-0 h-[1.5px] bg-destructive z-20 pointer-events-none"
                    style={{ top: `${(nowMin / 60) * 100}%` }}
                  >
                    <span className="absolute -left-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-destructive" />
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
      <div className="flex-shrink-0 bg-card border-t border-border px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Day Summary</span>
          <span className="text-[10px] font-mono text-muted-foreground">{activeHours}h active window</span>
        </div>
        {/* Segmented category bar */}
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex gap-px">
          {categoryTotals.map((cat) => (
            <div
              key={cat.id}
              className="h-full transition-all duration-500"
              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
              title={`${cat.name}: ${Math.round(cat.percentage)}%`}
            />
          ))}
        </div>
        {/* Legend */}
        {categoryTotals.length > 0 && (
          <div className="flex gap-3 mt-2 overflow-x-auto no-scrollbar">
            {categoryTotals.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[9px] font-medium text-foreground">
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
