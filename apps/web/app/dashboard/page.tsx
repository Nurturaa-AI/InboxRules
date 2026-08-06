"use client"

import { useState } from "react"

import StatCards from "@/components/dashboard/StatCards"
import DomainTable from "@/components/dashboard/DomainTable"
import AlertsFeed from "@/components/dashboard/AlertsFeed"
import HealthChart from "@/components/dashboard/HealthChart"
import ComplianceBreakdown from "@/components/dashboard/ComplianceBreakdown"
import AddDomainWizard from "@/components/dashboard/AddDomainWizard"

export default function DashboardPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            setRefreshKey((k) => k + 1)
            setShowWizard(false)
          }}
        />
      )}

      <StatCards />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DomainTable key={refreshKey} onAddDomain={() => setShowWizard(true)} />
        <div className="flex flex-col gap-6">
          <HealthChart />
          <AlertsFeed />
          <ComplianceBreakdown />
        </div>
      </div>
    </div>
  )
}
