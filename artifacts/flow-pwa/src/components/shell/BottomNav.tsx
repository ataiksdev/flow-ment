import { Link } from "wouter";
import { Clock, Timer, CheckSquare, BarChart2 } from "lucide-react";
import clsx from "clsx";

interface BottomNavProps {
  currentPath: string;
}

export default function BottomNav({ currentPath }: BottomNavProps) {
  const navItems = [
    { name: "Timeline", path: "/", icon: Clock },
    { name: "Timer", path: "/timer", icon: Timer },
    { name: "spacer", path: "#", icon: null }, // Spacer for FAB
    { name: "Habits", path: "/habits", icon: CheckSquare },
    { name: "Analytics", path: "/analytics", icon: BarChart2 },
  ];

  return (
    <nav className="absolute bottom-0 left-0 w-full bg-card border-t border-border pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, idx) => {
          if (item.name === "spacer") {
            return <div key="spacer" className="w-16" />; // Space for FAB
          }

          const isActive = currentPath === item.path;
          const Icon = item.icon!;

          return (
            <Link key={item.name} href={item.path} className="flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer" data-testid={`nav-${item.name.toLowerCase()}`}>
              <div className="relative p-1">
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
                <Icon 
                  className={clsx(
                    "w-6 h-6 transition-colors duration-200", 
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )} 
                />
              </div>
              <span className={clsx(
                "text-[10px] mt-1 font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
