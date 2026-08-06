"use client"

import { useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Save, Mail, MessageSquare, Webhook } from "lucide-react"

import { useApiQuery, apiRequest } from "@/lib/useApiQuery"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

/* ---------------- TYPES ---------------- */

type EmailKey = "onCritical" | "onWarning" | "weeklyReport"
type SlackKey = "onCritical" | "onWarning"

interface Channels {
  email: {
    enabled: boolean
    address: string
    onCritical: boolean
    onWarning: boolean
    weeklyReport: boolean
  }
  slack: {
    enabled: boolean
    webhookUrl: string | null
    onCritical: boolean
    onWarning: boolean
  }
  webhook: { enabled: boolean; url: string | null }
}

function defaultChannels(email: string): Channels {
  return {
    email: {
      enabled: true,
      address: email,
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
  }
}

/* ---------------- ROW ---------------- */

/** A labeled setting row with a Switch, wired for accessibility. */
function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

/* ---------------- PAGE ---------------- */

const EMAIL_KEYS: { key: EmailKey; label: string }[] = [
  { key: "onCritical", label: "Critical alerts" },
  { key: "onWarning", label: "Warning alerts" },
  { key: "weeklyReport", label: "Weekly report" },
]

const SLACK_KEYS: { key: SlackKey; label: string }[] = [
  { key: "onCritical", label: "Critical alerts to Slack" },
  { key: "onWarning", label: "Warning alerts to Slack" },
]

export default function SettingsPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || ""

  const { data: channelsData, loading } = useApiQuery<Channels>(
    "/alerts/channels"
  )

  const [saving, setSaving] = useState(false)
  // Local editable state — the single source of truth for the form. Seeded
  // from the API response once it arrives (fixes the prior bug where the UI
  // read fetched data but Save PUT stale local state, dropping every edit).
  const [channels, setChannels] = useState<Channels | null>(null)
  // Track which fetched payload we've already seeded from, so we adopt server
  // data exactly once (and again only if the fetch result identity changes) —
  // the React-recommended "adjust state during render" pattern, no effect.
  const [seededFrom, setSeededFrom] = useState<Channels | null>(null)

  if (!loading && channelsData !== seededFrom) {
    setSeededFrom(channelsData)
    setChannels(
      channelsData
        ? {
            ...channelsData,
            email: {
              ...channelsData.email,
              address: channelsData.email.address || userEmail,
            },
          }
        : defaultChannels(userEmail)
    )
  }

  async function handleSave() {
    if (!channels) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      await apiRequest("/alerts/channels", "PUT", token, channels)
      toast.success("Notification settings saved")
    } catch (err) {
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Choose how and when InboxRules notifies you"
        action={
          <Button onClick={handleSave} disabled={saving || !channels}>
            <Save />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {!channels ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : (
        <>
          {/* EMAIL */}
          <Card className="gap-0 p-0">
            <CardHeader className="flex flex-row items-center gap-2.5 border-b p-5">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
                <Mail aria-hidden="true" />
              </span>
              <CardTitle className="text-sm">Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email-address"
                  className="text-sm font-medium text-foreground"
                >
                  Notification address
                </label>
                <Input
                  id="email-address"
                  type="email"
                  value={channels.email.address}
                  onChange={(e) =>
                    setChannels((c) =>
                      c
                        ? { ...c, email: { ...c.email, address: e.target.value } }
                        : c
                    )
                  }
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                {EMAIL_KEYS.map((item) => (
                  <ToggleRow
                    key={item.key}
                    id={`email-${item.key}`}
                    label={item.label}
                    checked={channels.email[item.key]}
                    onCheckedChange={(v) =>
                      setChannels((c) =>
                        c ? { ...c, email: { ...c.email, [item.key]: v } } : c
                      )
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SLACK */}
          <Card className="gap-0 p-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2.5 border-b p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
                  <MessageSquare aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">Slack Notifications</CardTitle>
              </div>
              <Switch
                id="slack-enabled"
                aria-label="Enable Slack notifications"
                checked={channels.slack.enabled}
                onCheckedChange={(v) =>
                  setChannels((c) =>
                    c ? { ...c, slack: { ...c.slack, enabled: v } } : c
                  )
                }
              />
            </CardHeader>

            {channels.slack.enabled && (
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="slack-webhook"
                    className="text-sm font-medium text-foreground"
                  >
                    Webhook URL
                  </label>
                  <Input
                    id="slack-webhook"
                    type="url"
                    value={channels.slack.webhookUrl || ""}
                    onChange={(e) =>
                      setChannels((c) =>
                        c
                          ? {
                              ...c,
                              slack: {
                                ...c.slack,
                                webhookUrl: e.target.value,
                              },
                            }
                          : c
                      )
                    }
                    placeholder="https://hooks.slack.com/services/…"
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  {SLACK_KEYS.map((item) => (
                    <ToggleRow
                      key={item.key}
                      id={`slack-${item.key}`}
                      label={item.label}
                      checked={channels.slack[item.key]}
                      onCheckedChange={(v) =>
                        setChannels((c) =>
                          c
                            ? { ...c, slack: { ...c.slack, [item.key]: v } }
                            : c
                        )
                      }
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* WEBHOOK */}
          <Card className="gap-0 p-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2.5 border-b p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
                  <Webhook aria-hidden="true" />
                </span>
                <CardTitle className="text-sm">Custom Webhook</CardTitle>
              </div>
              <Switch
                id="webhook-enabled"
                aria-label="Enable custom webhook notifications"
                checked={channels.webhook.enabled}
                onCheckedChange={(v) =>
                  setChannels((c) =>
                    c ? { ...c, webhook: { ...c.webhook, enabled: v } } : c
                  )
                }
              />
            </CardHeader>

            {channels.webhook.enabled && (
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="webhook-url"
                    className="text-sm font-medium text-foreground"
                  >
                    Endpoint URL
                  </label>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={channels.webhook.url || ""}
                    onChange={(e) =>
                      setChannels((c) =>
                        c
                          ? {
                              ...c,
                              webhook: {
                                ...c.webhook,
                                url: e.target.value,
                              },
                            }
                          : c
                      )
                    }
                    placeholder="https://example.com/hooks/inboxrules"
                  />
                  <p className="text-xs text-muted-foreground">
                    We POST a JSON payload to this URL for every alert.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
