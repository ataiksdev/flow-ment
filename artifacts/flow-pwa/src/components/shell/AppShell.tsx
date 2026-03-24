import { ReactNode, useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { useLocation, useRoute } from "wouter";
import { HeartbeatBanner } from "../HeartbeatBanner";
import { NowBar } from "../NowBar";
import { Settings } from "lucide-react";
import { Link } from "wouter";

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

  const isSettings = location === "/settings";

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Compact top bar — brand left, settings right */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-border/60 bg-background flex-shrink-0">
        <span className="font-bold text-sm tracking-[0.18em] uppercase text-foreground/80">
          Fl<span className="text-primary">ō</span>w
        </span>
        <Link href="/settings">
          <button
            className={`w-7 h-7 flex items-center justify-center transition-colors ${
              isSettings ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-[11px] py-1.5 text-center font-bold uppercase tracking-widest z-50 border-b-2 border-destructive-border">
          Offline — data saved locally
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
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
