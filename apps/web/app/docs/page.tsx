import type { Metadata } from "next"

import PlaceholderPage from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = {
  title: "Documentation — InboxRules",
  description:
    "Guides and API references for monitoring email deliverability with InboxRules.",
}

export default function DocsPage() {
  return (
    <PlaceholderPage
      title="Documentation"
      description="Guides and API references for getting the most out of InboxRules are on the way."
    />
  )
}
