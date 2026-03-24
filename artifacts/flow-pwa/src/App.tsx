import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { HeartbeatProvider } from "@/providers/HeartbeatProvider";
import { TimerProvider } from "@/providers/TimerContext";
import { AppShell } from "@/components/shell/AppShell";

const Timeline = lazy(() => import("@/pages/Timeline"));
const Timer = lazy(() => import("@/pages/Timer"));
const Habits = lazy(() => import("@/pages/Habits"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" style={{ borderRadius: "50%" }} />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Timeline} />
        <Route path="/timer" component={Timer} />
        <Route path="/habits" component={Habits} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="flow-theme">
        <TimerProvider>
          <HeartbeatProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppShell>
                  <Router />
                </AppShell>
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </HeartbeatProvider>
        </TimerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
