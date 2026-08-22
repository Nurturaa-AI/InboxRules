import type { ReactNode } from "react"

import Footer from "@/components/dashboard/Footer"
import LegalHeader from "@/components/legal/LegalHeader"

/**
 * Shared chrome for the public informational/legal routes (/documentation,
 * /privacy, /terms). Route groups don't affect the URL, so these pages keep
 * their top-level paths. The layout reuses the app's existing Footer rather
 * than duplicating it, and pairs it with a slim public header. Flex column +
 * min-h-dvh keeps the footer pinned to the bottom on short pages.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div id="top" className="flex min-h-dvh flex-col bg-background">
      <LegalHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
