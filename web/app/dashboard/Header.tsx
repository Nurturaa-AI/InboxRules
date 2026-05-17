"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();

  // Use resolvedTheme instead of theme
  const isDark = resolvedTheme === "dark";

  return (
    <header
      className="h-16 bg-card border-b border-border flex items-center
                 gap-4 px-6 shrink-0"
    >
      <div className="flex-1">
        <h1 className="text-[17px] font-bold tracking-tight text-foreground">
          {title}
        </h1>

        {subtitle && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className="hidden md:flex items-center gap-2 bg-muted
                     border border-border rounded-lg px-3 h-9 w-52"
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          <input
            type="text"
            placeholder="Search domains..."
            className="bg-transparent border-none outline-none text-[13px]
                       text-foreground placeholder:text-muted-foreground
                       w-full font-sans"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-9 h-9 rounded-lg border border-border bg-card
                     flex items-center justify-center
                     text-muted-foreground hover:text-foreground
                     hover:bg-muted transition-all"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button
          className="w-9 h-9 rounded-lg border border-border bg-card
                     flex items-center justify-center relative
                     text-muted-foreground hover:text-foreground
                     hover:bg-muted transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />

          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500
                       rounded-full border-2 border-card"
          />
        </button>

        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white
                     font-semibold text-[13px] gap-1.5 h-9 px-3.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Domain
        </Button>
      </div>
    </header>
  );
}
