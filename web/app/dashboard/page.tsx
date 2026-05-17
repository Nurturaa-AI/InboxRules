// Main dashboard page — composes all the components together.

import Header from "@/app/dashboard/Header";
import StatCards from "@/app/dashboard/StatCards";
import DomainTable from "@/app/dashboard/DomainTable";
import AlertsFeed from "@/app/dashboard/AlertsFeed";
import HealthChart from "@/app/dashboard/HealthChart";

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Monitor your email compliance and deliverability health"
      />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Stat cards row */}
        <StatCards />

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Domain table — takes 2/3 of width on large screens */}
          <div className="xl:col-span-2">
            <DomainTable />
          </div>

          {/* Right column — chart and alerts */}
          <div className="space-y-5">
            <HealthChart />
            <AlertsFeed />
          </div>
        </div>
      </div>
    </>
  );
}
