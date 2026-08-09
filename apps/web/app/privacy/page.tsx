import type { Metadata } from "next"

import PlaceholderPage from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = {
  title: "Privacy Policy — InboxRules",
  description: "How InboxRules collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy Policy"
      description="Our full privacy policy is being finalized. It will detail how InboxRules collects, uses, and protects your data."
    />
  )
}
