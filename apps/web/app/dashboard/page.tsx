import StatCards from "@/components/dashboard/StatCards";
import DomainTable from "@/components/dashboard/DomainTable";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import HealthChart from "@/components/dashboard/HealthChart";
import ComplianceBreakdown from "@/components/dashboard/ComplianceBreakdown";

export default function DashboardPage() {
  return (
    <>
      <StatCards />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 310px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <DomainTable />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <HealthChart />
          <AlertsFeed />
          <ComplianceBreakdown />
        </div>
      </div>
    </>
  );
}
