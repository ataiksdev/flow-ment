import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useSettings } from "@/hooks/useDB";

interface HeartbeatContextType {
  isPromptVisible: boolean;
  showPrompt: () => void;
  hidePrompt: () => void;
  snooze: () => void;
}

const HeartbeatContext = createContext<HeartbeatContextType | null>(null);

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Safety check - wait for settings to load
    if (Object.keys(settings).length === 0) return;

    const isEnabled = settings.heartbeatEnabled !== false;
    if (!isEnabled) return;

    const intervalMinutes = settings.heartbeatInterval || 30;
    const ms = intervalMinutes * 60 * 1000;

    timerRef.current = setTimeout(() => {
      setIsPromptVisible(true);
    }, ms);
  }, [settings]);

  useEffect(() => {
    if (!isPromptVisible) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer, isPromptVisible]);

  const showPrompt = () => setIsPromptVisible(true);
  
  const hidePrompt = () => {
    setIsPromptVisible(false);
    startTimer();
  };

  const snooze = () => {
    setIsPromptVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Snooze for 15 minutes
    timerRef.current = setTimeout(() => setIsPromptVisible(true), 15 * 60 * 1000);
  };

  return (
    <HeartbeatContext.Provider value={{ isPromptVisible, showPrompt, hidePrompt, snooze }}>
      {children}
    </HeartbeatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHeartbeat() {
  const ctx = useContext(HeartbeatContext);
  if (!ctx) throw new Error("useHeartbeat must be used within HeartbeatProvider");
  return ctx;
}
