"use client";

import { useState, useEffect } from "react";
import Header from "./Header";

interface Props {
  children: React.ReactNode;
  onAddDomain?: () => void;
}

export default function DashboardShell({ children, onAddDomain }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("ir-theme") as "light" | "dark" | null;
    if (saved) applyTheme(saved);
  }, []);

  function applyTheme(t: "light" | "dark") {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("ir-theme", t);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      <Header
        theme={theme}
        onToggleTheme={() => applyTheme(theme === "light" ? "dark" : "light")}
        onAddDomain={onAddDomain}
      />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {children}
      </main>
    </div>
  );
}
