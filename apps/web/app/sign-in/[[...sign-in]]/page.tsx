import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Inbox, Check } from "lucide-react"

export default async function SignInPage() {
  const { userId } = await auth()

  // If already signed in, redirect to dashboard.
  if (userId) redirect("/dashboard")

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {/* Left side — branding */}
      <div className="mr-16 hidden w-[440px] flex-col justify-center px-12 py-10 lg:flex">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-lg">
            <Inbox className="size-5 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Inbox<span className="text-primary">Rules</span>
          </span>
        </div>

        <h1 className="mb-4 text-[32px] font-bold leading-tight tracking-tight text-foreground">
          Email compliance,
          <br />
          <span className="text-primary">finally simple.</span>
        </h1>

        <p className="mb-10 text-[15px] leading-relaxed text-muted-foreground">
          Monitor your SPF, DKIM, and DMARC records. Get alerted the moment
          something breaks. Stay compliant with Gmail and Yahoo bulk sender
          requirements.
        </p>

        {/* Feature list */}
        <ul className="flex flex-col gap-2.5">
          {[
            "Real-time DNS health monitoring",
            "AI-powered fix explanations",
            "Hosted RFC 8058 unsubscribe endpoint",
            "Instant alerts via email or Slack",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Right side — Clerk sign in component */}
      <SignIn />
    </div>
  )
}
