import { ReactNode, useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { useLocation } from "wouter";
import { HeartbeatBanner } from "../HeartbeatBanner";
import { NowBar } from "../NowBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-[11px] py-1.5 text-center font-bold uppercase tracking-widest z-50 border-b-2 border-destructive-border">
          Offline — data saved locally
        </div>
      )}

      {/* Main Content Area — padded for NowBar + Nav */}
      <main className="flex-1 overflow-y-auto relative" style={{ paddingBottom: "0" }}>
        {children}
      </main>

      {/* Heartbeat Overlay */}
      <HeartbeatBanner />

      {/* Now Bar — current activity + FAB + elapsed timer */}
      <NowBar />

      {/* Bottom Navigation */}
      <BottomNav currentPath={location} />
    </div>
  );
}
