import { createContext, useContext, useState, ReactNode } from "react";

interface TimerContextValue {
  isTimerRunning: boolean;
  setIsTimerRunning: (v: boolean) => void;
  timerLabel: string;
  setTimerLabel: (v: string) => void;
}

const TimerContext = createContext<TimerContextValue>({
  isTimerRunning: false,
  setIsTimerRunning: () => {},
  timerLabel: "",
  setTimerLabel: () => {},
});

export function TimerProvider({ children }: { children: ReactNode }) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerLabel, setTimerLabel] = useState("");

  return (
    <TimerContext.Provider value={{ isTimerRunning, setIsTimerRunning, timerLabel, setTimerLabel }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext() {
  return useContext(TimerContext);
}
