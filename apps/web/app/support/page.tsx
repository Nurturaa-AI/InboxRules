import type { Metadata } from "next"

import PlaceholderPage from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your InboxRules account and email deliverability.",
}

export default function SupportPage() {
  return (
    <PlaceholderPage
      title="Support"
      description="Need a hand? Our support resources are being put together. In the meantime, reach us at support@inboxrules.com."
    />
  )
}
