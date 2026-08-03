"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AddDomainWizard from "@/components/dashboard/AddDomainWizard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />
      <DashboardShell onAddDomain={() => setShowWizard(true)}>
        {children}
      </DashboardShell>

      {/* Wizard available from anywhere in the dashboard */}
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            setShowWizard(false);
            // Trigger a page refresh to show the new domain
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
