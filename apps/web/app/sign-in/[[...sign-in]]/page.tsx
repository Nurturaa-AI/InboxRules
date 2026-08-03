// Clerk's SignIn component handles everything:
// email/password, Google OAuth, forgot password, etc.

import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  //if already signed in, redirect to dashboard.
  if (userId) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      {/* Left side — branding */}
      <div
        className="hidden lg:flex flex-col justify-center"
        style={{
          width: 440,
          padding: "40px 60px",
          marginRight: 60,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3" style={{ marginBottom: 40 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            📬
          </div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.3px",
            }}
          >
            Inbox<span style={{ color: "#2563EB" }}>Rules</span>
          </span>
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.5px",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Email compliance,
          <br />
          <span style={{ color: "#2563EB" }}>finally simple.</span>
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "var(--text-2)",
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          Monitor your SPF, DKIM, and DMARC records. Get alerted the moment
          something breaks. Stay compliant with Gmail and Yahoo bulk sender
          requirements.
        </p>

        {/* Feature list */}
        {[
          "✅ Real-time DNS health monitoring",
          "✅ AI-powered fix explanations",
          "✅ Hosted RFC 8058 unsubscribe endpoint",
          "✅ Instant alerts via email or Slack",
        ].map((feature) => (
          <div
            key={feature}
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            {feature}
          </div>
        ))}
      </div>

      {/* Right side — Clerk sign in component */}
      <SignIn />
    </div>
  );
}
