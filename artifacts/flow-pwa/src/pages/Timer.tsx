import { useState, useEffect, useRef } from "react";
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

  // Completion Drawer State
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
            return prev + 1; // stopwatch counts up
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

  // SVG Circle calculations
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  let progress = 1;
  if (mode === "pomodoro") {
    progress = timeLeft / totalDuration;
  } else {
    progress = (timeLeft % 60) / 60; // 1 min rotation for stopwatch
  }
  const strokeDashoffset = circumference - progress * circumference;

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col h-full bg-background pt-12 pb-24 px-6 items-center">
      {/* Mode Toggle */}
      <div className="bg-muted p-1 rounded-full flex gap-1 mb-10 w-full max-w-xs">
        <button 
          onClick={() => handleModeSwitch("pomodoro")}
          className={clsx("flex-1 py-2 rounded-full text-sm font-bold transition-all", mode === "pomodoro" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => handleModeSwitch("stopwatch")}
          className={clsx("flex-1 py-2 rounded-full text-sm font-bold transition-all", mode === "stopwatch" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
        >
          Stopwatch
        </button>
      </div>

      {mode === "pomodoro" && (
        <div className="flex gap-4 mb-12">
          {(["focus", "shortBreak", "longBreak"] as PomodoroType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setPomodoroType(t); setIsRunning(false); }}
              className={clsx(
                "text-xs font-bold uppercase tracking-wider transition-colors pb-1 border-b-2",
                pomoType === t ? "text-primary border-primary" : "text-muted-foreground border-transparent"
              )}
            >
              {t.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>
      )}

      {/* Circle Timer */}
      <div className="relative flex items-center justify-center mb-12 drop-shadow-xl">
        <svg width="300" height="300" className="-rotate-90">
          <circle
            cx="150" cy="150" r={radius}
            stroke="currentColor" strokeWidth="8" fill="transparent"
            className="text-muted opacity-30"
          />
          <circle
            cx="150" cy="150" r={radius}
            stroke={pomoType === "focus" || mode === "stopwatch" ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
            strokeWidth="8" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-6xl font-bold tracking-tighter text-foreground">
            {mins}:{secs}
          </span>
          {mode === "stopwatch" && <span className="text-muted-foreground font-mono mt-2">counting...</span>}
        </div>
      </div>

      {/* Editable Label */}
      <input 
        type="text"
        value={sessionLabel}
        onChange={(e) => setSessionLabel(e.target.value)}
        className="bg-transparent text-center text-xl font-serif font-bold focus:outline-none focus:border-b-2 border-primary border-transparent pb-1 mb-10 w-full max-w-xs transition-colors placeholder:text-muted-foreground/50"
        placeholder="Session goal..."
      />

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button onClick={resetTimer} className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
          <RotateCcw className="w-6 h-6" />
        </button>
        
        <button 
          onClick={toggleTimer} 
          className="w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>

        {mode === "stopwatch" && !isRunning && timeLeft > 0 ? (
          <button onClick={() => setDrawerOpen(true)} className="w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-md flex items-center justify-center hover:scale-105 transition-transform">
            <Save className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-14" /> // spacer
        )}
      </div>

      {/* Save Session Drawer */}
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] h-auto mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-bold font-serif mb-2">Save Session</h2>
            <p className="text-muted-foreground font-mono text-sm mb-6">Duration: {Math.round((mode === "pomodoro" ? totalDuration : timeLeft) / 60)} min</p>

            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Select Category</label>
            <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id!)}
                  className={clsx(
                    "flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
                    categoryId === cat.id ? "text-white shadow-md border-transparent" : "bg-background border-border text-foreground hover:bg-muted"
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
              className="w-full py-4 rounded-xl font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all shadow-lg mt-2"
            >
              Log Time
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
