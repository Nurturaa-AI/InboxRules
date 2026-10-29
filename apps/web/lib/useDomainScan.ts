"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useApi } from "@/lib/api"
import { refreshAllQueries } from "@/lib/useApiQuery"

/** Queueing is not completion: wait for a newer recorded scan before reporting success. */
export function useDomainScan() {
  const api = useApi()
  const [scanning, setScanning] = useState<string[]>([])
  const active = useRef(new Set<string>())
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    const jobs = active.current
    return () => { mounted.current = false; jobs.clear() }
  }, [])

  async function scan(domain: { id: string; domain: string; lastCheckedAt: string | null }) {
    if (active.current.has(domain.id)) return
    active.current.add(domain.id)
    setScanning([...active.current])
    try {
      await api.post(`/domains/${domain.id}/scan`, {})
      toast.info(`Scan queued for ${domain.domain}`, { description: "Previous results stay visible until a new scan completes." })
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000))
        if (!mounted.current || !active.current.has(domain.id)) return
        const result = await api.get<{ data: { lastCheckedAt: string | null } }>(`/domains/${domain.id}`)
        if (result.data.lastCheckedAt && result.data.lastCheckedAt !== domain.lastCheckedAt) {
          refreshAllQueries()
          toast.success(`New scan results available for ${domain.domain}`)
          return
        }
      }
      toast.info("Scan results are still pending", { description: "Refresh domains later to check for a completed scan. Previous results remain visible." })
    } catch (err) {
      if (mounted.current) toast.error("Unable to confirm scan results", { description: err instanceof Error ? err.message : undefined })
    } finally {
      active.current.delete(domain.id)
      if (mounted.current) setScanning([...active.current])
    }
  }
  return { scan, scanning }
}
