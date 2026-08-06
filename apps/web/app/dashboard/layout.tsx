"use client"

import { useState } from "react"
import Sidebar from "@/components/dashboard/Sidebar"
import DashboardShell from "@/components/dashboard/DashboardShell"
import AddDomainWizard from "@/components/dashboard/AddDomainWizard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showWizard, setShowWizard] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <DashboardShell
        onAddDomain={() => setShowWizard(true)}
        onMenuClick={() => setSidebarOpen(true)}
      >
        {children}
      </DashboardShell>

      {/* Wizard available from anywhere in the dashboard */}
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            setShowWizard(false)
            // Trigger a page refresh to show the new domain
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
