"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { refreshAllQueries } from "@/lib/useApiQuery"

import StatCards from "@/components/dashboard/StatCards"
import DomainTable from "@/components/dashboard/DomainTable"
import AlertsFeed from "@/components/dashboard/AlertsFeed"
import HealthChart from "@/components/dashboard/HealthChart"
import ComplianceBreakdown from "@/components/dashboard/ComplianceBreakdown"
import AddDomainWizard from "@/components/dashboard/AddDomainWizard"

export default function DashboardPage() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <div className="space-y-6">
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            refreshAllQueries()
            setShowWizard(false)
          }}
        />
      )}

      <PageHeader title="Email operations" description="Review changes, investigate authentication issues, and track domain health." />
      <AlertsFeed />
      <StatCards />
      <DomainTable onAddDomain={() => setShowWizard(true)} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <HealthChart />
        <ComplianceBreakdown />
      </div>
    </div>
  )
}
