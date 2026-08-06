"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

/**
 * Tiny module-level pub/sub so a mutation anywhere (e.g. adding a domain from
 * the shell) can refresh every mounted query without a full-page reload.
 * `refreshAllQueries()` bumps a version that all live `useApiQuery` hooks
 * subscribe to via `useSyncExternalStore`, triggering a refetch.
 */
let refreshVersion = 0;
const refreshListeners = new Set<() => void>();

export function refreshAllQueries() {
  refreshVersion += 1;
  refreshListeners.forEach((fn) => fn());
}

function subscribeRefresh(fn: () => void) {
  refreshListeners.add(fn);
  return () => {
    refreshListeners.delete(fn);
  };
}

function getRefreshVersion() {
  return refreshVersion;
}

export function useApiQuery<T>(path: string) {
  const { getToken } = useAuth();
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Re-render (and refetch) whenever a global refresh is broadcast.
  const version = useSyncExternalStore(
    subscribeRefresh,
    getRefreshVersion,
    getRefreshVersion,
  );

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_URL}/api/v1${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error?.message || `Request failed: ${response.status}`);
      }

      const json = await response.json();
      // Handle both { data: ... } and raw array/object responses
      setData(json.data ?? json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [getToken, path]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 0);

    return () => clearTimeout(timer);
    // `version` bumps on a global refresh broadcast → re-run the fetch.
  }, [refetch, version]);

  return { data, loading, error, refetch };
}

export async function apiRequest(
  path:   string,
  method: string,
  token:  string,
  body?:  object
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      (json as { error?: { message?: string } }).error?.message || "Request failed"
    );
  }

  return json as Record<string, unknown>;
}