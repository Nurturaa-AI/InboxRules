import Sidebar from "@/components/dashboard/Sidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
