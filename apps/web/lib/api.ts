// Centralizes all API calls to the Fastify backend.
// Uses the Clerk token for authentication on every request.

import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

// Hook that returns authenticated fetch functions
export function useApi() {
  const { getToken } = useAuth();

  // Generic authenticated GET request
  async function get<T>(path: string): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_URL}/api/v1${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Request failed");
    }

    return response.json();
  }

  // Generic authenticated POST request
  async function post<T>(path: string, body: object): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Request failed");
    }

    return response.json();
  }

  // Generic authenticated DELETE request
  async function del<T>(path: string): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_URL}/api/v1${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Request failed");
    }

    return response.json();
  }

  // SSE streaming for real-time DNS analysis
  // Returns an EventSource that emits events as they arrive
  async function streamAnalysis(
    domain: string,
    onDnsResult: (result: string) => void,
    onAiToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ) {
    const token = await getToken();

    // Use fetch for SSE with auth header
    // EventSource doesn't support custom headers so we use fetch
    const response = await fetch(`${API_URL}/api/v1/ai/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok || !response.body) {
      onError("Analysis request failed");
      return;
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE message delimiter)
      const messages = buffer.split("\n\n");
      buffer = messages.pop() || "";

      for (const message of messages) {
        if (!message.trim()) continue;

        const lines = message.split("\n");
        let event = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.substring(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.substring(6).trim();
          }
        }

        if (!data) continue;

        try {
          const parsed = JSON.parse(data);

          if (event === "dns_result") onDnsResult(parsed);
          if (event === "ai_token") onAiToken(parsed.token || "");
          if (event === "done") onDone();
          if (event === "error") onError(parsed.message || "Analysis failed");
        } catch {
          // Ignore parse errors on individual messages
        }
      }
    }
  }

  return { get, post, del, streamAnalysis };
}
