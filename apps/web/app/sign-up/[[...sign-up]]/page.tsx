// app/sign-up/[[...sign-up]]/page.tsx

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
      <div
        className="hidden lg:flex flex-col justify-center"
        style={{ width: 440, padding: "40px 60px", marginRight: 60 }}
      >
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
          Start monitoring
          <br />
          <span style={{ color: "#2563EB" }}>in 5 minutes.</span>
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "var(--text-2)",
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          Add your first domain and get a complete compliance health report
          instantly. No credit card required.
        </p>

        {[
          "🆓 Free plan includes 3 domains",
          "⚡ First scan runs immediately",
          "🔒 Your data is never shared",
          "📧 Cancel anytime",
        ].map((item) => (
          <div
            key={item}
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <SignUp />
    </div>
  );
}
