"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

import { Button } from "@/components/ui/button"

// Stable no-op subscribe for the mounted flag — the value never changes after
// the initial client render, so there's nothing to subscribe to.
const subscribeNoop = () => () => {}

/**
 * Standalone light/dark toggle. Mirrors the toggle baked into the dashboard
 * Header so the informational/legal pages can switch themes with identical
 * behaviour, without depending on the (auth-aware) dashboard Header.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // next-themes can't know the theme during SSR, so `resolvedTheme` is undefined
  // on the server and on the first client render. This hydration-safe flag reads
  // false on the server + first client render (matching the server HTML) and
  // true afterward, so the theme-dependent aria-label never triggers a mismatch.
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle theme"
      }
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  )
}
