import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, subDays, parseISO, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { useTimeEntries, useCategories, useSettings, useUpdateSetting } from "@/hooks/useDB";
import { EditEntryDrawer } from "@/components/EditEntryDrawer";
import { StreakCalendar } from "@/components/StreakCalendar";
import type { TimeEntry } from "@/lib/db";
import { Drawer } from "vaul";

function getHourBg(hour: number): string {
  if (hour >= 21 || hour < 5) return "var(--hour-night)";
  if (hour >= 5 && hour < 8) return "var(--hour-dawn)";
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
    minutesInCell: cellEndMin - cellStartMin,
  };
}

function fmtTime(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const entries = useTimeEntries(dateStr);
  const categories = useCategories();
  const settings = useSettings();
  const updateSetting = useUpdateSetting();

  // Frog of the Day
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasMountedFrog = useRef(false);
  const [showFrogModal, setShowFrogModal] = useState(false);
  const [frogInput, setFrogInput] = useState("");

  const frogDate: string | undefined = settings.frogDate;
  const frogText: string | undefined = settings.frogText;
  const frogDone: boolean = settings.frogDone === true;

  useEffect(() => {
    if (hasMountedFrog.current) return;
    if (Object.keys(settings).length === 0) return; // wait for settings to load
    hasMountedFrog.current = true;
    // Show modal if today's frog hasn't been set
    if (frogDate !== todayStr) {
      setShowFrogModal(true);
    }
  }, [settings, frogDate, todayStr]);

  const saveFrog = async () => {
    if (!frogInput.trim()) return;
    await updateSetting("frogDate", todayStr);
    await updateSetting("frogText", frogInput.trim());
    await updateSetting("frogDone", false);
    setShowFrogModal(false);
    setFrogInput("");
  };

  const toggleFrogDone = async () => {
    await updateSetting("frogDone", !frogDone);
  };

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

  // Minutes tracked per hour (for font-size data viz)
  const hourMinutes = useMemo(() => {
    const map: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      map[h] = entries.reduce((acc, e) => {
        const seg = entrySegmentForHour(e, h);
        return acc + (seg ? seg.minutesInCell : 0);
      }, 0);
    }
    return map;
  }, [entries]);

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

  // Entries in selected hour for the detail drawer
  const hourDetailEntries = useMemo(() => {
    if (selectedHour === null) return [];
    return entries
      .map((e) => {
        const seg = entrySegmentForHour(e, selectedHour);
        if (!seg) return null;
        const cat = categories.find((c) => c.id === e.categoryId);
        return { entry: e, seg, cat };
      })
      .filter(Boolean) as {
        entry: TimeEntry;
        seg: { topPct: number; heightPct: number; minutesInCell: number };
        cat: (typeof categories)[0] | undefined;
      }[];
  }, [selectedHour, entries, categories]);

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

        {/* Day progress bar with time-period colour segments */}
        <div className="px-4 pb-3">
          <div className="relative h-2 w-full border border-border overflow-hidden" style={{ backgroundColor: "var(--hour-night)" }}>
            <div className="absolute inset-0 flex">
              {[
                { pct: (5/24)*100, color: "var(--hour-night)" },
                { pct: (3/24)*100, color: "var(--hour-dawn)" },
                { pct: (5/24)*100, color: "var(--hour-morning)" },
                { pct: (5/24)*100, color: "var(--hour-afternoon)" },
                { pct: (4/24)*100, color: "var(--hour-evening)" },
                { pct: (2/24)*100, color: "var(--hour-night)" },
              ].map((seg, i) => (
                <div key={i} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
              ))}
            </div>
            {isToday && (
              <>
                <div
                  className="absolute left-0 top-0 h-full bg-foreground/20 transition-all duration-1000"
                  style={{ width: `${dayProgressPct}%` }}
                />
                <div
                  className="absolute top-0 h-full w-[3px] bg-primary z-10"
                  style={{ left: `${dayProgressPct}%` }}
                />
              </>
            )}
            {isPast && <div className="absolute inset-0 bg-muted-foreground/30" />}
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
      <StreakCalendar />

      {/* Frog of the Day Banner */}
      {frogDate === todayStr && frogText && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-border flex-shrink-0"
          style={{ backgroundColor: frogDone ? "hsl(var(--muted))" : "hsl(35 90% 15%)" }}
        >
          <button
            onClick={toggleFrogDone}
            className="w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all"
            style={{ borderColor: frogDone ? "hsl(var(--muted-foreground))" : "hsl(35 90% 55%)" }}
          >
            {frogDone && <Check className="w-3 h-3" style={{ color: "hsl(var(--muted-foreground))" }} />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: frogDone ? "hsl(var(--muted-foreground))" : "hsl(35 90% 60%)" }}>
              Frog of the Day
            </p>
            <p className={`text-xs font-bold uppercase tracking-wide truncate ${frogDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {frogText}
            </p>
          </div>
          <button
            onClick={() => { setFrogInput(""); setShowFrogModal(true); }}
            className="text-[8px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wide flex-shrink-0 px-2 py-1 border border-border/50"
          >
            Change
          </button>
        </div>
      )}

      {/* 4×6 Hour Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-[2px]" style={{ background: "hsl(var(--border))" }}>
          {hours.map((hour) => {
            const isCurrentHour = isToday && hour === nowHour;
            const isElapsed = isToday && hour < nowHour;
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
                seg: { topPct: number; heightPct: number; minutesInCell: number };
                cat: (typeof categories)[0] | undefined;
              }[];

            // Font size as data visualization: 10px (empty) → 22px (full hour tracked)
            const trackedMins = hourMinutes[hour] || 0;
            const hourLabelSize = 10 + Math.round((trackedMins / 60) * 12);

            return (
              <div
                key={hour}
                className="relative overflow-hidden transition-all cursor-pointer"
                style={{
                  height: isCurrentHour ? 88 : 72,
                  backgroundColor: getHourBg(hour),
                  filter: cellIsElapsed ? "grayscale(0.6)" : undefined,
                  opacity: cellIsElapsed ? 0.45 : 1,
                  outline: isCurrentHour ? "2px solid hsl(var(--primary))" : undefined,
                  outlineOffset: isCurrentHour ? "-2px" : undefined,
                  zIndex: isCurrentHour ? 2 : undefined,
                }}
                onClick={() => setSelectedHour(hour)}
              >
                {/* Hour label — size encodes logged intensity */}
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    left: 7,
                    fontSize: hourLabelSize,
                    fontFamily: "Space Mono, monospace",
                    fontWeight: 700,
                    color: isCurrentHour
                      ? "hsl(var(--primary))"
                      : trackedMins > 0
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                    opacity: cellIsElapsed ? 0.7 : isCurrentHour ? 1 : trackedMins > 0 ? 0.9 : 0.4,
                    zIndex: 10,
                    lineHeight: 1,
                    transition: "font-size 0.3s ease",
                  }}
                >
                  {String(hour).padStart(2, "0")}
                </span>

                {/* Entry segments */}
                {hourEntries.map(({ entry, seg, cat }, idx) => (
                  <div
                    key={`${entry.id}-${hour}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEntry(entry);
                    }}
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

      {/* Frog of the Day Modal */}
      <Drawer.Root open={showFrogModal} onOpenChange={(open) => !open && setShowFrogModal(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col fixed bottom-0 left-0 right-0 z-50 pb-10 px-6 pt-5 border-t-2 border-border">
            <div className="mx-auto w-12 h-0.5 bg-muted-foreground/30 mb-6" />
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🐸</span>
                <h2 className="text-2xl font-bold uppercase tracking-tight">Frog of the Day</h2>
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
                "Eat the frog" — your most important task today
              </p>
            </div>
            <input
              autoFocus
              type="text"
              value={frogInput}
              onChange={(e) => setFrogInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFrog()}
              placeholder="What must you do today above all else?"
              className="w-full bg-background border-2 border-border px-4 py-4 text-base font-bold focus:outline-none focus:border-primary mb-3 uppercase tracking-wide placeholder:text-muted-foreground/40 placeholder:normal-case"
            />
            <div className="flex gap-3">
              <button
                onClick={saveFrog}
                disabled={!frogInput.trim()}
                className="flex-1 py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 transition-all border-2 border-primary uppercase tracking-wider"
              >
                Set Frog
              </button>
              <button
                onClick={() => setShowFrogModal(false)}
                className="w-14 py-4 border-2 border-border font-bold text-muted-foreground hover:bg-muted uppercase tracking-wider text-xs"
              >
                Skip
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit Entry Drawer */}
      <EditEntryDrawer entry={editingEntry} onClose={() => setEditingEntry(null)} />

      {/* Hour Detail Drawer — list of all activities in that hour */}
      <Drawer.Root
        open={selectedHour !== null}
        onOpenChange={(open) => !open && setSelectedHour(null)}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 border-t-2 border-border max-h-[70vh]">
            <div className="px-5 pt-4 flex-shrink-0">
              <div className="mx-auto w-12 h-0.5 bg-muted-foreground/30 mb-5" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight font-mono">
                    {selectedHour !== null ? String(selectedHour).padStart(2, "0") : ""}:00
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {hourDetailEntries.length === 0 ? "No activities" : `${hourDetailEntries.length} activit${hourDetailEntries.length === 1 ? "y" : "ies"}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHour(null)}
                  className="w-9 h-9 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-[2px]">
              {hourDetailEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm font-bold uppercase tracking-wide">Nothing logged here</p>
                  <p className="text-xs mt-1 opacity-70">Tap the + button to add an entry</p>
                </div>
              ) : (
                hourDetailEntries.map(({ entry, cat }) => {
                  const durationMins = differenceInMinutes(
                    parseISO(entry.endTime),
                    parseISO(entry.startTime)
                  );
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-3 py-3 bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => {
                        setSelectedHour(null);
                        setTimeout(() => setEditingEntry(entry), 150);
                      }}
                    >
                      <div
                        className="w-1 self-stretch flex-shrink-0"
                        style={{ backgroundColor: cat?.color ?? "#aaa" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm uppercase tracking-wide truncate">
                          {entry.description || cat?.name || "Untitled"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {fmtTime(entry.startTime)} – {fmtTime(entry.endTime)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-mono font-bold text-foreground">
                          {durationMins}m
                        </div>
                        {cat && (
                          <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                            {cat.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

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
