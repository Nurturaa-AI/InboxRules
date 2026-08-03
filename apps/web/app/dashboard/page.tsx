"use client";

import { useState } from "react";
import StatCards from "@/components/dashboard/StatCards";
import DomainTable from "@/components/dashboard/DomainTable";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import HealthChart from "@/components/dashboard/HealthChart";
import ComplianceBreakdown from "@/components/dashboard/ComplianceBreakdown";
import AddDomainWizard from "@/components/dashboard/AddDomainWizard";

export default function DashboardPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            setRefreshKey((k) => k + 1);
            setShowWizard(false);
          }}
        />
      )}

      <StatCards />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 310px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <DomainTable key={refreshKey} onAddDomain={() => setShowWizard(true)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <HealthChart />
          <AlertsFeed />
          <ComplianceBreakdown />
        </div>
      </div>
    </>
  );
}
