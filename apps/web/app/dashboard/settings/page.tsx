// app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import {
  Save,
  Bell,
  Shield,
  Key,
  Globe,
  MessageSquare,
  Mail,
} from "lucide-react";

type ToggleProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
};

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: checked ? "#2563EB" : "var(--border-2)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
};

function Field({ label, value, onChange, type = "text" }: FieldProps) {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 40,
          padding: "0 14px",
        }}
      />
    </div>
  );
}
export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    emailOnCritical: true,
    emailOnWarning: true,
    emailWeeklyReport: true,
    slackOnCritical: false,
    slackOnWarning: false,
  });
  const [profile, setProfile] = useState({
    name: "Princewill Ohuchukwu",
    email: "princewill@inboxrules.io",
    company: "InboxRules",
  });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const SECTION_STYLE = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    overflow: "hidden" as const,
  };

  const HEADER_STYLE = {
    padding: "16px 24px",
    borderBottom: "1px solid var(--border)",
  };

  const BODY_STYLE = {
    padding: "24px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 18,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.4px",
            }}
          >
            Settings
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Manage your account, notifications, and integrations
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2"
          style={{
            height: 38,
            padding: "0 16px",
            background: saved
              ? "rgba(16,185,129,0.1)"
              : "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: saved ? "#10B981" : "white",
            border: saved ? "1px solid rgba(16,185,129,0.3)" : "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            transition: "all 0.2s",
          }}
        >
          <Save size={14} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Profile settings */}
      <div style={SECTION_STYLE}>
        <div style={HEADER_STYLE}>
          <div className="flex items-center gap-2">
            <Globe size={14} color="var(--text-3)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Profile
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Your account information
          </p>
        </div>
        <div style={BODY_STYLE}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <Field
              label="Full Name"
              value={profile.name}
              onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
            />
            <Field
              label="Email Address"
              value={profile.email}
              onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
              type="email"
            />
          </div>
          <Field
            label="Company Name"
            value={profile.company}
            onChange={(v) => setProfile((p) => ({ ...p, company: v }))}
          />
        </div>
      </div>

      {/* Notification settings */}
      <div style={SECTION_STYLE}>
        <div style={HEADER_STYLE}>
          <div className="flex items-center gap-2">
            <Bell size={14} color="var(--text-3)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Notifications
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Choose how and when you get notified about compliance issues
          </p>
        </div>
        <div style={BODY_STYLE}>
          {/* Email notifications */}
          <div>
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 14 }}
            >
              <Mail size={14} color="#2563EB" />
              <p
                style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}
              >
                Email Notifications
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  key: "emailOnCritical",
                  label: "Critical alerts",
                  desc: "SPF failures, DMARC removed, lookup limit exceeded",
                },
                {
                  key: "emailOnWarning",
                  label: "Warning alerts",
                  desc: "Weak DKIM keys, DMARC p=none, approaching limits",
                },
                {
                  key: "emailWeeklyReport",
                  label: "Weekly report",
                  desc: "Summary of all domains every Monday morning",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between"
                  style={{
                    padding: "12px 16px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-3)",
                        marginTop: 2,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <Toggle
                    checked={
                      notifications[item.key as keyof typeof notifications]
                    }
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, [item.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Message notifications */}
          <div>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 14 }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} color="#4A154B" />
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Message Notifications
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(245,158,11,0.1)",
                  color: "#F59E0B",
                }}
              >
                Pro Feature
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  marginBottom: 6,
                }}
              >
                Slack Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  placeholder="https://hooks.slack.com/services/..."
                  style={{
                    flex: 1,
                    height: 40,
                    padding: "0 14px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    fontSize: 13,
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
                <button
                  style={{
                    padding: "0 14px",
                    borderRadius: 9,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--text-2)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Test
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "slackOnCritical", label: "Critical alerts to Slack" },
                { key: "slackOnWarning", label: "Warning alerts to Slack" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between"
                  style={{
                    padding: "12px 16px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {item.label}
                  </p>
                  <Toggle
                    checked={
                      notifications[item.key as keyof typeof notifications]
                    }
                    onChange={(v) =>
                      setNotifications((n) => ({ ...n, [item.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* API keys */}
      <div style={SECTION_STYLE}>
        <div style={HEADER_STYLE}>
          <div className="flex items-center gap-2">
            <Key size={14} color="var(--text-3)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              API Keys
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Use API keys to access InboxRules programmatically
          </p>
        </div>
        <div style={BODY_STYLE}>
          {/* Existing key */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Production Key
              </p>
              <code
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-3)",
                  marginTop: 4,
                  display: "block",
                }}
              >
                ir_live_••••••••••••••••••••••••••••••••
              </code>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(16,185,129,0.1)",
                color: "#10B981",
              }}
            >
              Active
            </span>
            <button
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#EF4444",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Revoke
            </button>
          </div>

          <button
            className="flex items-center gap-2"
            style={{
              height: 38,
              padding: "0 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-2)",
              fontFamily: "var(--font-sans)",
              alignSelf: "flex-start",
            }}
          >
            + Generate New Key
          </button>
        </div>
      </div>

      {/* Security settings */}
      <div style={SECTION_STYLE}>
        <div style={HEADER_STYLE}>
          <div className="flex items-center gap-2">
            <Shield size={14} color="var(--text-3)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Security
            </h2>
          </div>
        </div>
        <div style={BODY_STYLE}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-2)",
                marginBottom: 6,
              }}
            >
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              style={{
                width: "100%",
                maxWidth: 360,
                height: 40,
                padding: "0 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                fontSize: 13,
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              maxWidth: 720,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  marginBottom: 6,
                }}
              >
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  fontSize: 13,
                  color: "var(--text)",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  marginBottom: 6,
                }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  fontSize: 13,
                  color: "var(--text)",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <button
            style={{
              height: 38,
              padding: "0 16px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-2)",
              fontFamily: "var(--font-sans)",
              alignSelf: "flex-start",
            }}
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div
        style={{
          background: "rgba(239,68,68,0.04)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>
            Danger Zone
          </h2>
        </div>
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              Delete Account
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4 }}>
              Permanently delete your account and all data. This cannot be
              undone.
            </p>
          </div>
          <button
            style={{
              padding: "8px 16px",
              background: "none",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "#EF4444",
              fontFamily: "var(--font-sans)",
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
