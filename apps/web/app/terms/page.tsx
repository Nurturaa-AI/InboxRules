import type { Metadata } from "next"

import PlaceholderPage from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = {
  title: "Terms of Service — InboxRules",
  description: "The terms governing your use of InboxRules.",
}

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Terms of Service"
      description="Our terms of service are being finalized and will be published here shortly."
    />
  )
}
