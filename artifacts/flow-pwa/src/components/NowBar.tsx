import { useState, useEffect, useMemo } from "react";
import { format, parseISO, differenceInSeconds } from "date-fns";
import { useTimeEntries, useCategories } from "@/hooks/useDB";
import { QuickEntryDrawer } from "./QuickEntry";
import { Plus, Zap, Clock } from "lucide-react";

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function NowBar() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const entries = useTimeEntries(todayStr);
  const categories = useCategories();
  const [tick, setTick] = useState(0);

  // Tick every second to update timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();

  const activeEntry = useMemo(
    () =>
      entries.find((e) => {
        const start = parseISO(e.startTime);
        const end = parseISO(e.endTime);
        return start <= now && end >= now;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, tick]
  );

  const lastEntry = useMemo(() => {
    const past = entries.filter((e) => parseISO(e.startTime) <= now);
    if (past.length === 0) return null;
    return past.reduce((latest, e) =>
      parseISO(e.endTime) > parseISO(latest.endTime) ? e : latest
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, tick]);

  const displayEntry = activeEntry ?? lastEntry;
  const displayCat = displayEntry
    ? categories.find((c) => c.id === displayEntry.categoryId)
    : null;

  const elapsedSecs = useMemo(() => {
    if (!displayEntry) return 0;
    if (activeEntry) {
      return Math.max(0, differenceInSeconds(now, parseISO(activeEntry.startTime)));
    }
    return Math.max(0, differenceInSeconds(now, parseISO(lastEntry!.endTime)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, displayEntry, activeEntry, lastEntry]);

  const isActive = !!activeEntry;
  const accentColor = displayCat?.color ?? "hsl(var(--muted-foreground))";

  return (
    <div className="flex items-stretch bg-card border-t-2 border-border h-14 relative overflow-hidden">
      {/* Thin coloured top strip — matches category */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: accentColor, opacity: displayEntry ? 1 : 0.3 }}
      />

      {displayEntry ? (
        <>
          {/* Category accent bar */}
          <div
            className="w-1 self-stretch flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />

          {/* Activity info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
            <div className="flex items-center gap-1.5">
              {isActive ? (
                <Zap className="w-2.5 h-2.5 text-amber-500 fill-current flex-shrink-0" />
              ) : (
                <Clock className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {isActive ? "Now" : "Last"}
              </span>
            </div>
            <div className="text-sm font-bold truncate leading-tight mt-0.5">
              {displayEntry.description || displayCat?.name || "Untitled"}
            </div>
          </div>

          {/* Live timer */}
          <div className="flex flex-col items-end justify-center px-3 flex-shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {isActive ? "Elapsed" : "Idle"}
            </span>
            <span
              className="font-mono font-bold text-base leading-tight"
              style={{ color: isActive ? accentColor : "hsl(var(--muted-foreground))" }}
            >
              {formatElapsed(elapsedSecs)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center px-3">
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
            No activity yet today
          </span>
        </div>
      )}

      {/* FAB — Bauhaus circle embedded in bar */}
      <div className="flex items-center px-3 flex-shrink-0">
        <QuickEntryDrawer>
          <button
            className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-foreground/10"
            style={{ borderRadius: "50%" }}
            data-testid="fab-quick-entry"
            aria-label="Quick Entry"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </QuickEntryDrawer>
      </div>
    </div>
  );
}
