// Thin wrapper around next-themes ThemeProvider.
// We wrap it so we can add "use client" — ThemeProvider
// uses React context which only works in client components.

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
