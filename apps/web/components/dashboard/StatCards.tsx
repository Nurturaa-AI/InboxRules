"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { Globe, ShieldCheck, AlertTriangle, Mail } from "lucide-react"

import { MetricCard } from "@/components/shared/MetricCard"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

interface Stats {
  totalDomains: number
  healthyDomains: number
  activeAlerts: number
  unsubscribes: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500"

export default function StatCards() {
  const { getToken } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalDomains: 0,
    healthyDomains: 0,
    activeAlerts: 0,
    unsubscribes: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const [domainsRes, alertsRes, suppressionRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/domains?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/alerts?status=unresolved&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/suppression?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const domainsData = domainsRes.ok ? await domainsRes.json() : null
      const alertsData = alertsRes.ok ? await alertsRes.json() : null
      const suppressionData = suppressionRes.ok
        ? await suppressionRes.json()
        : null

      const domains = domainsData?.data || []

      setStats({
        totalDomains: domains.length,
        healthyDomains: domains.filter(
          (d: { healthScore: number }) => d.healthScore >= 80
        ).length,
        activeAlerts: alertsData?.pagination?.total ?? 0,
        unsubscribes: suppressionData?.pagination?.total ?? 0,
      })
    } catch {
      // keep zeros on error
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    // Avoid calling setState synchronously within an effect to prevent
    // cascading renders. Schedule the fetch asynchronously.
    void Promise.resolve().then(() => fetchStats())
  }, [fetchStats])

  if (loading) {
    return <LoadingSkeleton variant="metrics" count={4} />
  }

  const healthyPct =
    stats.totalDomains > 0
      ? Math.round((stats.healthyDomains / stats.totalDomains) * 100)
      : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Domains"
        value={stats.totalDomains}
        icon={Globe}
        hint={`${stats.healthyDomains} healthy`}
      />
      <MetricCard
        label="Healthy Domains"
        value={stats.healthyDomains}
        icon={ShieldCheck}
        delta={stats.totalDomains > 0 ? `${healthyPct}%` : undefined}
        trend={stats.totalDomains > 0 ? "up" : "neutral"}
        hint={stats.totalDomains > 0 ? "of total" : "No domains yet"}
      />
      <MetricCard
        label="Active Alerts"
        value={stats.activeAlerts}
        icon={AlertTriangle}
        trendUpIsGood={false}
        hint={stats.activeAlerts === 0 ? "All clear" : "Need attention"}
      />
      <MetricCard
        label="Unsubscribes"
        value={stats.unsubscribes}
        icon={Mail}
        hint="Via hosted endpoint"
      />
    </div>
  )
}
