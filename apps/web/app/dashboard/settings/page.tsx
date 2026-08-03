"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Save } from "lucide-react";
import { useApiQuery, apiRequest } from "@/lib/useApiQuery";

/* ---------------- TYPES ---------------- */

type EmailKey = "onCritical" | "onWarning" | "weeklyReport";
type SlackKey = "onCritical" | "onWarning";

interface Channels {
  email: {
    enabled: boolean;
    address: string;
    onCritical: boolean;
    onWarning: boolean;
    weeklyReport: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string | null;
    onCritical: boolean;
    onWarning: boolean;
  };
  webhook: { enabled: boolean; url: string | null };
}

/* ---------------- TOGGLE (MUST BE OUTSIDE COMPONENT) ---------------- */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

/* ---------------- PAGE ---------------- */

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const { data: channelsData } = useApiQuery<Channels>("/alerts/channels");

  const [saving, setSaving] = useState(false);

  const [channels, setChannels] = useState<Channels>({
    email: {
      enabled: true,
      address: user?.emailAddresses?.[0]?.emailAddress || "",
      onCritical: true,
      onWarning: true,
      weeklyReport: true,
    },
    slack: {
      enabled: false,
      webhookUrl: null,
      onCritical: true,
      onWarning: false,
    },
    webhook: { enabled: false, url: null },
  });

  const mergedChannels = channelsData ?? channels;

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();

      if (!token) throw new Error("No auth token");

      await apiRequest("/alerts/channels", "PUT", token, channels);
    } finally {
      setSaving(false);
    }
  }

  const EMAIL_KEYS: { key: EmailKey; label: string }[] = [
    { key: "onCritical", label: "Critical alerts" },
    { key: "onWarning", label: "Warning alerts" },
    { key: "weeklyReport", label: "Weekly report" },
  ];

  const SLACK_KEYS: { key: SlackKey; label: string }[] = [
    { key: "onCritical", label: "Critical alerts to Slack" },
    { key: "onWarning", label: "Warning alerts to Slack" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 14px",
            background: "#2563EB",
            color: "white",
            borderRadius: 8,
            border: "none",
          }}
        >
          <Save size={14} /> {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* EMAIL */}
      <section>
        <h2>Email Notifications</h2>

        {EMAIL_KEYS.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 12,
              border: "1px solid #ddd",
              marginTop: 8,
            }}
          >
            <span>{item.label}</span>

            <Toggle
              checked={mergedChannels.email[item.key]}
              onChange={(v) =>
                setChannels((c) => ({
                  ...c,
                  email: { ...c.email, [item.key]: v },
                }))
              }
            />
          </div>
        ))}
      </section>

      {/* SLACK */}
      <section>
        <h2>Slack Notifications</h2>

        <Toggle
          checked={mergedChannels.slack.enabled}
          onChange={(v) =>
            setChannels((c) => ({
              ...c,
              slack: { ...c.slack, enabled: v },
            }))
          }
        />

        {mergedChannels.slack.enabled && (
          <>
            <input
              value={mergedChannels.slack.webhookUrl || ""}
              onChange={(e) =>
                setChannels((c) => ({
                  ...c,
                  slack: { ...c.slack, webhookUrl: e.target.value },
                }))
              }
              placeholder="Slack webhook"
              style={{ width: "100%", marginTop: 10 }}
            />

            {SLACK_KEYS.map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 12,
                  border: "1px solid #ddd",
                  marginTop: 8,
                }}
              >
                <span>{item.label}</span>

                <Toggle
                  checked={mergedChannels.slack[item.key]}
                  onChange={(v) =>
                    setChannels((c) => ({
                      ...c,
                      slack: { ...c.slack, [item.key]: v },
                    }))
                  }
                />
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
