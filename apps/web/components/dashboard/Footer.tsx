import Link from "next/link"

// Footer navigation. Every href points to a real, existing route
// (see app/docs, app/support, app/privacy, app/terms).
const FOOTER_LINKS = [
  { label: "Documentation", href: "/docs" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
]

export default function Footer() {
  return (
    <footer className="border-t border-card-neutral-border bg-card-neutral">
      <div className="flex flex-col items-center gap-4 px-4 py-5 text-center sm:flex-row sm:justify-between sm:gap-6 sm:px-6 sm:text-left">
        {/* Copyright + tagline */}
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">
            © 2026{" "}
            <span className="font-semibold text-foreground">InboxRules</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Email deliverability monitoring made simple.
          </p>
        </div>

        {/* Navigation */}
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
