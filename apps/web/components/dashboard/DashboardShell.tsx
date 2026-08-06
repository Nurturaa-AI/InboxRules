"use client"

import Header from "./Header"

interface Props {
  children: React.ReactNode
  onAddDomain?: () => void
  onMenuClick?: () => void
}

export default function DashboardShell({
  children,
  onAddDomain,
  onMenuClick,
}: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Header onAddDomain={onAddDomain} onMenuClick={onMenuClick} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
