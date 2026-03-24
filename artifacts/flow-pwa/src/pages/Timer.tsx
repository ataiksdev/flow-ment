import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Save, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { useSettings, useCategories, useAddTimerSession, useHabits } from "@/hooks/useDB";
import { useTimerContext } from "@/providers/TimerContext";
import { Drawer } from "vaul";
import clsx from "clsx";

type TimerMode = "pomodoro" | "stopwatch";
type PomodoroType = "focus" | "shortBreak" | "longBreak";

const MAX_OVERRUN_SECS = 3600;

export default function Timer() {
  const settings = useSettings();
  const categories = useCategories();
  const habits = useHabits();
  const addTimerSession = useAddTimerSession();
  const { setIsTimerRunning, setTimerLabel } = useTimerContext();

  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [pomoType, setPomodoroType] = useState<PomodoroType>("focus");

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [overrunSecs, setOverrunSecs] = useState(0);
  const [isOverrun, setIsOverrun] = useState(false);
  const [totalDuration, setTotalDuration] = useState(25 * 60);

  const [sessionLabel, setSessionLabel] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [saveDrawerOpen, setSaveDrawerOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  // Editable duration
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editInput, setEditInput] = useState("");

  useEffect(() => { setIsTimerRunning(isRunning); }, [isRunning, setIsTimerRunning]);
  useEffect(() => { setTimerLabel(sessionLabel); }, [sessionLabel, setTimerLabel]);

  useEffect(() => {
    if (!isRunning && mode === "pomodoro") {
      let mins = pomoType === "focus" ? (settings.timerPomodoro || 25)
        : pomoType === "shortBreak" ? (settings.timerShortBreak || 5)
        : (settings.timerLongBreak || 15);
      setTimeLeft(mins * 60);
      setTotalDuration(mins * 60);
      setOverrunSecs(0);
      setIsOverrun(false);
    }
  }, [pomoType, settings, mode, isRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === "stopwatch") { setTimeLeft((p) => p + 1); return; }
        if (!isOverrun) {
          setTimeLeft((p) => {
            if (p <= 1) { setIsOverrun(true); return 0; }
            return p - 1;
          });
        } else {
          setOverrunSecs((p) => {
            if (p >= MAX_OVERRUN_SECS) { setIsRunning(false); setSaveDrawerOpen(true); return p; }
            return p + 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, isOverrun]);

  const handleTimerCircleClick = () => {
    if (!isRunning && mode === "pomodoro" && !isOverrun) {
      setEditInput(String(Math.floor(timeLeft / 60)));
      setIsEditingDuration(true);
    }
  };

  const confirmDuration = () => {
    const mins = parseInt(editInput);
    if (!isNaN(mins) && mins >= 1 && mins <= 120) {
      setTimeLeft(mins * 60);
      setTotalDuration(mins * 60);
    }
    setIsEditingDuration(false);
  };

  const startOrSetup = () => {
    if (!isRunning && !categoryId) { setSetupOpen(true); return; }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false); setIsOverrun(false); setOverrunSecs(0);
    if (mode === "pomodoro") {
      const mins = pomoType === "focus" ? (settings.timerPomodoro || 25)
        : pomoType === "shortBreak" ? (settings.timerShortBreak || 5)
        : (settings.timerLongBreak || 15);
      setTimeLeft(mins * 60);
    } else { setTimeLeft(0); }
  };

  const handleModeSwitch = (m: TimerMode) => {
    setIsRunning(false); setMode(m); setIsOverrun(false); setOverrunSecs(0);
    if (m === "stopwatch") { setTimeLeft(0); setTotalDuration(0); } else { setPomodoroType("focus"); }
  };

  const saveSession = async () => {
    if (!categoryId) return;
    const end = new Date();
    const durationSecs = mode === "pomodoro" ? totalDuration + overrunSecs : timeLeft;
    if (durationSecs <= 0) return;
    const start = new Date(end.getTime() - durationSecs * 1000);
    const label = sessionLabel || (mode === "pomodoro" ? "Pomodoro Session" : "Stopwatch Session");
    await addTimerSession({ label, categoryId, mode, durationSecs, startTime: start.toISOString(), endTime: end.toISOString(), date: format(end, "yyyy-MM-dd") });
    setSaveDrawerOpen(false);
    resetTimer();
  };

  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const progress = mode === "pomodoro"
    ? (isOverrun ? 1 : timeLeft / Math.max(1, totalDuration))
    : (timeLeft % 60) / 60;
  const strokeDashoffset = circumference - progress * circumference;

  const displaySecs = isOverrun ? overrunSecs : timeLeft;
  const mins = Math.floor(displaySecs / 60).toString().padStart(2, "0");
  const secs = (displaySecs % 60).toString().padStart(2, "0");

  const trackColor = isOverrun ? "hsl(35 90% 55%)"
    : pomoType === "focus" || mode === "stopwatch" ? "hsl(var(--primary))"
    : "hsl(var(--secondary))";

  const selectedCat = categories.find((c) => c.id === categoryId);

  return (
    <div className="flex flex-col h-full bg-background pt-6 pb-4 px-6 items-center overflow-y-auto no-scrollbar">
      {/* Mode Toggle */}
      <div className="w-full max-w-xs mb-5 flex border-2 border-border">
        {(["pomodoro", "stopwatch"] as TimerMode[]).map((m, i) => (
          <button key={m} onClick={() => handleModeSwitch(m)}
            className={clsx("flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors",
              i === 0 && "border-r border-border",
              mode === m ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted")}>
            {m === "pomodoro" ? "Focus" : "Stopwatch"}
          </button>
        ))}
      </div>

      {mode === "pomodoro" && (
        <div className="flex gap-0 mb-5 border-b-2 border-border w-full max-w-xs">
          {(["focus", "shortBreak", "longBreak"] as PomodoroType[]).map((t) => (
            <button key={t} onClick={() => { setPomodoroType(t); setIsRunning(false); }}
              className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-[3px] -mb-[2px]",
                pomoType === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
              {t === "focus" ? "Focus" : t === "shortBreak" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      )}

      {/* Goal selector */}
      <button onClick={() => setSetupOpen(true)}
        className="w-full max-w-xs mb-5 flex items-center gap-2 border border-border px-3 py-2 hover:bg-muted transition-colors">
        {selectedCat && <span className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: selectedCat.color }} />}
        <span className={clsx("flex-1 text-left text-sm font-bold truncate uppercase tracking-wide",
          sessionLabel || selectedCat ? "text-foreground" : "text-muted-foreground/60")}>
          {sessionLabel || (selectedCat ? selectedCat.name : "Set goal & category…")}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Circular Timer — click to edit duration */}
      <div className="relative flex items-center justify-center mb-5">
        <svg width="280" height="280" className="-rotate-90"
          onClick={handleTimerCircleClick}
          style={{ cursor: !isRunning && mode === "pomodoro" ? "pointer" : "default" }}>
          <circle cx="140" cy="140" r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="transparent" />
          <circle cx="140" cy="140" r={radius - 6} fill="hsl(var(--card))" />
          <circle cx="140" cy="140" r={radius} stroke={trackColor} strokeWidth="10" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="square" className="transition-all duration-1000 ease-linear" />
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 140 + (radius + 14) * Math.sin(rad);
            const y = 140 - (radius + 14) * Math.cos(rad);
            return <rect key={deg} x={x - 3} y={y - 3} width={6} height={6} fill="hsl(var(--muted-foreground))" opacity={0.3} transform={`rotate(${deg}, ${x}, ${y})`} />;
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {isEditingDuration ? (
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              <input
                type="number"
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmDuration()}
                min={1} max={120}
                autoFocus
                className="w-20 text-center font-mono text-4xl font-bold bg-transparent border-b-2 border-primary focus:outline-none text-foreground"
              />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">minutes</span>
              <button onClick={confirmDuration} className="mt-1 px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest">
                Set
              </button>
            </div>
          ) : (
            <>
              {isOverrun && (
                <span className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(35 90% 55%)" }}>
                  +Overrun
                </span>
              )}
              <span className="font-mono text-5xl font-bold tracking-tighter"
                style={{ color: isOverrun ? "hsl(35 90% 55%)" : "hsl(var(--foreground))" }}>
                {isOverrun ? "+" : ""}{mins}:{secs}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {isOverrun ? "overrun" : mode === "stopwatch" ? "elapsed" : pomoType === "focus" ? "focus" : "break"}
              </span>
              {!isRunning && mode === "pomodoro" && (
                <span className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-widest mt-2">
                  tap to edit
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <button onClick={resetTimer} className="w-12 h-12 bg-card border-2 border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button onClick={startOrSetup}
          className="w-20 h-20 bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-foreground/10 shadow-[3px_3px_0px_hsl(var(--foreground)/0.15)]"
          style={{ borderRadius: "50%" }}>
          {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>
        {(mode === "stopwatch" && !isRunning && timeLeft > 0) || (isOverrun && !isRunning) ? (
          <button onClick={() => setSaveDrawerOpen(true)} className="w-12 h-12 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center hover:scale-105 transition-transform">
            <Save className="w-5 h-5" />
          </button>
        ) : <div className="w-12" />}
      </div>

      {selectedCat && !isRunning && (
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: selectedCat.color }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{selectedCat.name}</span>
        </div>
      )}

      {/* Setup Drawer */}
      <Drawer.Root open={setupOpen} onOpenChange={setSetupOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4 border-t-2 border-border overflow-y-auto">
            <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-6" />
            <h2 className="text-xl font-bold uppercase tracking-tight mb-5">Session Setup</h2>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Goal / Task</label>
            <input type="text" value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}
              placeholder="What are you working on?"
              className="w-full bg-background border-2 border-border px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary mb-5 uppercase tracking-wide placeholder:text-muted-foreground/40 placeholder:normal-case" />
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Category</label>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1 mb-3">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryId(cat.id!)}
                  className={clsx("flex-shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all border-2",
                    categoryId === cat.id ? "text-white border-transparent" : "bg-background border-border text-foreground hover:bg-muted")}
                  style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}>
                  {cat.name}
                </button>
              ))}
            </div>
            {habits.length > 0 && (
              <>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Or choose a habit</label>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1 mb-4">
                  {habits.map((h) => (
                    <button key={h.id} onClick={() => setSessionLabel(h.name)}
                      className={clsx("flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide border transition-all",
                        sessionLabel === h.name ? "border-2 border-transparent text-white" : "border-border bg-background text-foreground hover:bg-muted")}
                      style={sessionLabel === h.name ? { backgroundColor: h.color } : {}}>
                      <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: h.color }} />
                      {h.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => { setSetupOpen(false); if (!isRunning) setIsRunning(true); }} disabled={!categoryId}
              className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 transition-all border-2 border-primary uppercase tracking-wider mt-auto">
              {isRunning ? "Save Setup" : "Start Timer"}
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Save Session Drawer */}
      <Drawer.Root open={saveDrawerOpen} onOpenChange={setSaveDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col h-auto mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4 border-t-2 border-border">
            <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-1">Save Session</h2>
            <p className="text-muted-foreground font-mono text-sm mb-6">
              {Math.round((mode === "pomodoro" ? totalDuration + overrunSecs : timeLeft) / 60)}m{isOverrun ? " (incl. overrun)" : ""}
            </p>
            {!categoryId && (
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setCategoryId(cat.id!)}
                    className={clsx("flex-shrink-0 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all border-2",
                      categoryId === cat.id ? "text-white border-transparent" : "bg-background border-border text-foreground hover:bg-muted")}
                    style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <button onClick={saveSession} disabled={!categoryId}
              className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all border-2 border-primary uppercase tracking-wider">
              Log Time
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
