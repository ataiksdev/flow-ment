import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Save } from "lucide-react";
import { format } from "date-fns";
import { useSettings, useCategories, useAddTimerSession } from "@/hooks/useDB";
import { Drawer } from "vaul";
import clsx from "clsx";

type TimerMode = "pomodoro" | "stopwatch";
type PomodoroType = "focus" | "shortBreak" | "longBreak";

export default function Timer() {
  const settings = useSettings();
  const categories = useCategories();
  const addTimerSession = useAddTimerSession();

  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [pomoType, setPomodoroType] = useState<PomodoroType>("focus");

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("Deep Work Session");
  const [totalDuration, setTotalDuration] = useState(25 * 60);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning && mode === "pomodoro") {
      let mins = 25;
      if (pomoType === "focus") mins = settings.timerPomodoro || 25;
      if (pomoType === "shortBreak") mins = settings.timerShortBreak || 5;
      if (pomoType === "longBreak") mins = settings.timerLongBreak || 15;
      setTimeLeft(mins * 60);
      setTotalDuration(mins * 60);
    }
  }, [pomoType, settings, mode, isRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (mode === "pomodoro") {
            if (prev <= 1) {
              setIsRunning(false);
              if (pomoType === "focus") setDrawerOpen(true);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, pomoType]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === "pomodoro") {
      let mins = 25;
      if (pomoType === "focus") mins = settings.timerPomodoro || 25;
      if (pomoType === "shortBreak") mins = settings.timerShortBreak || 5;
      if (pomoType === "longBreak") mins = settings.timerLongBreak || 15;
      setTimeLeft(mins * 60);
    } else {
      setTimeLeft(0);
    }
  };

  const handleModeSwitch = (m: TimerMode) => {
    setIsRunning(false);
    setMode(m);
    if (m === "stopwatch") {
      setTimeLeft(0);
      setTotalDuration(0);
    } else {
      setPomodoroType("focus");
    }
  };

  const saveSession = async () => {
    if (!categoryId) return;
    const end = new Date();
    const durationSecs = mode === "pomodoro" ? totalDuration : timeLeft;
    if (durationSecs <= 0) return;
    const start = new Date(end.getTime() - durationSecs * 1000);
    const label = sessionLabel || (mode === "pomodoro" ? "Pomodoro Session" : "Stopwatch Session");

    await addTimerSession({
      label,
      categoryId,
      mode,
      durationSecs,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      date: format(end, "yyyy-MM-dd"),
    });
    setDrawerOpen(false);
    resetTimer();
  };

  // SVG Circle — kept as intentional Bauhaus primary circle form
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  let progress = 1;
  if (mode === "pomodoro") {
    progress = timeLeft / totalDuration;
  } else {
    progress = (timeLeft % 60) / 60;
  }
  const strokeDashoffset = circumference - progress * circumference;

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");

  const trackColor =
    pomoType === "focus" || mode === "stopwatch"
      ? "hsl(var(--primary))"
      : "hsl(var(--secondary))";

  return (
    <div className="flex flex-col h-full bg-background pt-10 pb-24 px-6 items-center overflow-y-auto no-scrollbar">

      {/* Mode Toggle — sharp rectangular segments, Bauhaus */}
      <div className="w-full max-w-xs mb-8 flex border-2 border-border">
        <button
          onClick={() => handleModeSwitch("pomodoro")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors border-r border-border",
            mode === "pomodoro"
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Focus
        </button>
        <button
          onClick={() => handleModeSwitch("stopwatch")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors",
            mode === "stopwatch"
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          Stopwatch
        </button>
      </div>

      {/* Pomodoro sub-type — bold underline tabs */}
      {mode === "pomodoro" && (
        <div className="flex gap-0 mb-10 border-b-2 border-border w-full max-w-xs">
          {(["focus", "shortBreak", "longBreak"] as PomodoroType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setPomodoroType(t);
                setIsRunning(false);
              }}
              className={clsx(
                "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-[3px] -mb-[2px]",
                pomoType === t
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {t === "focus" ? "Focus" : t === "shortBreak" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      )}

      {/* Circular Timer — Bauhaus circle (primary geometric form) */}
      <div className="relative flex items-center justify-center mb-10">
        <svg width="280" height="280" className="-rotate-90">
          {/* Background track */}
          <circle
            cx="140" cy="140" r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Diagonal hatch fill inside circle — Bauhaus texture */}
          <circle
            cx="140" cy="140" r={radius - 6}
            fill="hsl(var(--card))"
          />
          {/* Progress arc */}
          <circle
            cx="140" cy="140" r={radius}
            stroke={trackColor}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="square"
            className="transition-all duration-1000 ease-linear"
          />
          {/* Corner square tick marks — Bauhaus decoration */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 140 + (radius + 14) * Math.sin(rad);
            const y = 140 - (radius + 14) * Math.cos(rad);
            return (
              <rect
                key={deg}
                x={x - 3} y={y - 3} width={6} height={6}
                fill="hsl(var(--muted-foreground))"
                opacity={0.3}
                transform={`rotate(${deg}, ${x}, ${y})`}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-bold tracking-tighter text-foreground">
            {mins}:{secs}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            {mode === "stopwatch" ? "elapsed" : pomoType === "focus" ? "focus" : "break"}
          </span>
        </div>
      </div>

      {/* Session label */}
      <input
        type="text"
        value={sessionLabel}
        onChange={(e) => setSessionLabel(e.target.value)}
        className="bg-transparent text-center text-lg font-bold focus:outline-none border-b-2 border-transparent focus:border-primary pb-1 mb-8 w-full max-w-xs transition-colors placeholder:text-muted-foreground/50 uppercase tracking-wide"
        placeholder="Session goal..."
      />

      {/* Controls */}
      <div className="flex items-center gap-5">
        {/* Reset — square */}
        <button
          onClick={resetTimer}
          className="w-12 h-12 bg-card border-2 border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Play/Pause — circle (Bauhaus primary form) */}
        <button
          onClick={toggleTimer}
          className="w-20 h-20 bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-foreground/10 shadow-[3px_3px_0px_hsl(var(--foreground)/0.15)]"
          style={{ borderRadius: "50%" }}
        >
          {isRunning ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        {/* Save — square */}
        {mode === "stopwatch" && !isRunning && timeLeft > 0 ? (
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-12 h-12 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Save className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Save Session Drawer */}
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col h-auto mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4 border-t-2 border-border">
            <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-1">Save Session</h2>
            <p className="text-muted-foreground font-mono text-sm mb-6">
              {Math.round((mode === "pomodoro" ? totalDuration : timeLeft) / 60)} min
            </p>

            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
              Category
            </label>
            <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id!)}
                  className={clsx(
                    "flex-shrink-0 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all border-2",
                    categoryId === cat.id
                      ? "text-white border-transparent"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                  style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <button
              onClick={saveSession}
              disabled={!categoryId}
              className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all border-2 border-primary mt-2 uppercase tracking-wider"
            >
              Log Time
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
