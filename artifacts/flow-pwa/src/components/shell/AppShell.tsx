import { ReactNode, useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { useLocation } from "wouter";
import { HeartbeatBanner } from "../HeartbeatBanner";
import { QuickEntryDrawer } from "../QuickEntry";
import { Plus } from "lucide-react";

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
        <div className="bg-destructive text-destructive-foreground text-xs py-1 text-center font-medium z-50">
          You are offline — data saved locally
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative" style={{ paddingBottom: "5rem" }}>
        {children}
      </main>

      {/* Heartbeat Overlay */}
      <HeartbeatBanner />

      {/* Bottom Navigation */}
      <BottomNav currentPath={location} />

      {/* Floating Action Button — pinned above bottom nav */}
      <QuickEntryDrawer>
        <button
          className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          data-testid="fab-quick-entry"
          aria-label="Quick Entry"
        >
          <Plus className="w-6 h-6" />
        </button>
      </QuickEntryDrawer>
    </div>
  );
}
