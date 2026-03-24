import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context & Shell
import { ThemeProvider } from "@/providers/ThemeProvider";
import { HeartbeatProvider } from "@/providers/HeartbeatProvider";
import { AppShell } from "@/components/shell/AppShell";

// Pages
import Timeline from "@/pages/Timeline";
import Timer from "@/pages/Timer";
import Habits from "@/pages/Habits";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Timeline} />
      <Route path="/timer" component={Timer} />
      <Route path="/habits" component={Habits} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="flow-theme">
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
