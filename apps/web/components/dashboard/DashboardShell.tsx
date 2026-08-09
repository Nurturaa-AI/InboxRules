"use client"

import Header from "./Header"
import Footer from "./Footer"

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
      {/* Scroll container. The content wrapper grows (flex-1) so that on short
          pages the footer is pushed to the bottom of the viewport, while on
          long pages it scrolls into view beneath the content. */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
        <Footer />
      </main>
    </div>
  )
}
