import { Link } from "wouter";
import { Clock, Timer, Layers, BarChart2, Settings } from "lucide-react";
import clsx from "clsx";

interface BottomNavProps {
  currentPath: string;
}

export default function BottomNav({ currentPath }: BottomNavProps) {
  const navItems = [
    { name: "Timeline", path: "/", icon: Clock },
    { name: "Timer", path: "/timer", icon: Timer },
    { name: "Compose", path: "/habits", icon: Layers },
    { name: "Analytics", path: "/analytics", icon: BarChart2 },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <nav className="w-full bg-card border-t-2 border-border pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex items-stretch h-16 px-0">
        {navItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path !== "/" && currentPath.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.path}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center h-full relative cursor-pointer transition-colors duration-150",
                isActive ? "bg-primary/8" : "hover:bg-muted/60"
              )}
              data-testid={`nav-${item.name.toLowerCase()}`}
            >
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
              )}
              <Icon
                className={clsx(
                  "w-[18px] h-[18px] transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={clsx(
                  "text-[9px] mt-1 font-bold uppercase tracking-wider",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
