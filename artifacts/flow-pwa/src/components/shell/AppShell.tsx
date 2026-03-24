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
        <div className="bg-destructive text-destructive-foreground text-[11px] py-1.5 text-center font-bold uppercase tracking-widest z-50 border-b-2 border-destructive-border">
          Offline — data saved locally
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

      {/* Floating Action Button — circle is an intentional Bauhaus primary form */}
      <QuickEntryDrawer>
        <button
          className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-[3px_3px_0px_hsl(var(--foreground)/0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-foreground/10"
          data-testid="fab-quick-entry"
          aria-label="Quick Entry"
          style={{ borderRadius: "50%" }}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </QuickEntryDrawer>
    </div>
  );
}
