import { SignUp } from "@clerk/nextjs"
import { Inbox, Check } from "lucide-react"

export default function SignUpPage() {
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
          Start monitoring
          <br />
          <span className="text-primary">in 5 minutes.</span>
        </h1>

        <p className="mb-8 text-[15px] leading-relaxed text-muted-foreground">
          Add your first domain and get a complete compliance health report
          instantly. No credit card required.
        </p>

        {/* Feature list */}
        <ul className="flex flex-col gap-2.5">
          {[
            "Free plan includes 3 domains",
            "First scan runs immediately",
            "Your data is never shared",
            "Cancel anytime",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Right side — Clerk sign up component */}
      <SignUp />
    </div>
  )
}
