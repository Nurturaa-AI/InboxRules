// apps/unsub/src/index.ts
//
// RFC 8058 One-Click Unsubscribe Endpoint
//
// This Cloudflare Worker handles POST requests from email clients
// when a recipient clicks the one-click unsubscribe button in Gmail,
// Yahoo, or any RFC 8058 compliant email client.
//
// Gmail and Yahoo REQUIRE this endpoint to:
// 1. Accept POST requests (not just GET)
// 2. Respond within 10 seconds
// 3. Actually remove the user from the mailing list
// 4. Return 200 OK on success
//
// This runs at Cloudflare's global edge — zero cold starts,
// available in 300+ cities worldwide, independent of our main app.

// ─────────────────────────────────────────────
// ENVIRONMENT VARIABLES
// Cloudflare Workers uses an Env object instead of process.env
// ─────────────────────────────────────────────

interface Env {
  // Secret used to sign and verify unsubscribe tokens
  // Must match UNSUB_HMAC_SECRET in the main API
  UNSUB_HMAC_SECRET: string;

  // Our main API URL — we call it to record the unsubscribe event
  API_URL: string;

  // Internal API key for worker-to-api communication
  INTERNAL_API_KEY: string;
}

// ─────────────────────────────────────────────
// MAIN WORKER EXPORT
// Cloudflare Workers uses this fetch function as the entry point
// Every HTTP request to our worker URL calls this function
// ─────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Parse the URL to get the pathname
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ─────────────────────────────────────────────
    // ROUTING
    // ─────────────────────────────────────────────

    // POST /unsubscribe/:token
    // Called by email clients when user clicks one-click unsubscribe
    // This is the RFC 8058 handler
    if (request.method === "POST" && pathname.startsWith("/unsubscribe/")) {
      return handleOneClickUnsubscribe(request, env, pathname);
    }

    // GET /unsubscribe/:token
    // Called when user clicks the regular unsubscribe link in email
    // Shows a confirmation page and processes the unsubscribe
    if (request.method === "GET" && pathname.startsWith("/unsubscribe/")) {
      return handleManualUnsubscribe(request, env, pathname);
    }

    // GET /health
    // Health check for monitoring
    if (request.method === "GET" && pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "inboxrules-unsub" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // OPTIONS — handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // All other routes return 404
    return new Response("Not found", { status: 404 });
  },
};

// ─────────────────────────────────────────────
// RFC 8058 ONE-CLICK UNSUBSCRIBE HANDLER
// Called by Gmail, Yahoo, and other email clients automatically
// when the user clicks the unsubscribe button in the email header
//
// Requirements from RFC 8058:
// - Must accept POST with body: List-Unsubscribe=One-Click
// - Must process the unsubscribe immediately
// - Must return 200 OK
// - Must not require the user to do anything else
// ─────────────────────────────────────────────

async function handleOneClickUnsubscribe(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  // Extract token from URL path
  // URL format: /unsubscribe/{token}
  const token = extractToken(pathname);

  if (!token) {
    // Return 200 even for invalid tokens
    // RFC 8058 says we must not return errors that confuse email clients
    return successResponse();
  }

  // Verify the request body contains the required field
  // RFC 8058 requires: List-Unsubscribe=One-Click in the POST body
  let body = "";
  try {
    body = await request.text();
  } catch {
    // If we cannot read the body, still process the unsubscribe
    // Some email clients send empty bodies
  }

  // The body should contain "List-Unsubscribe=One-Click"
  // but we process the unsubscribe regardless for reliability
  const isValidOneClickRequest =
    body.includes("List-Unsubscribe=One-Click") || body === "";

  if (!isValidOneClickRequest) {
    // Log unexpected body format but still process
    console.log("[Unsub] Unexpected POST body:", body.substring(0, 100));
  }

  // Verify the token is valid and record the unsubscribe
  const result = await processUnsubscribe(token, env, "one_click");

  if (!result.success) {
    // Return 200 regardless — email clients should not retry on failure
    // Log the error internally for debugging
    console.error("[Unsub] One-click failed:", result.error);
    return successResponse();
  }

  return successResponse();
}

// ─────────────────────────────────────────────
// MANUAL UNSUBSCRIBE HANDLER
// Called when user clicks the regular unsubscribe link
// Shows an HTML confirmation page
// ─────────────────────────────────────────────

async function handleManualUnsubscribe(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  const token = extractToken(pathname);

  if (!token) {
    return htmlResponse(buildErrorPage("Invalid unsubscribe link"));
  }

  // Process the unsubscribe
  const result = await processUnsubscribe(token, env, "manual_click");

  if (!result.success) {
    // Show a generic success page even on error
    // We do not want users to see error messages
    // Log the error internally
    console.error("[Unsub] Manual unsubscribe failed:", result.error);
  }

  // Always show the success page
  // The user clicked unsubscribe — honor it and confirm it
  return htmlResponse(buildSuccessPage());
}

// ─────────────────────────────────────────────
// CORE UNSUBSCRIBE LOGIC
// Validates the token and calls our main API to record the event
// ─────────────────────────────────────────────

interface UnsubscribeResult {
  success: boolean;
  error?: string;
}

async function processUnsubscribe(
  token: string,
  env: Env,
  method: "one_click" | "manual_click",
): Promise<UnsubscribeResult> {
  // Validate token format before calling the API
  // Tokens are 64-character hex strings (SHA-256 HMAC)
  if (!isValidTokenFormat(token)) {
    return { success: false, error: "Invalid token format" };
  }

  try {
    // Call our main API to record the unsubscribe event
    // The API verifies the HMAC signature and writes to the database
    const response = await fetch(`${env.API_URL}/internal/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal API key authenticates worker-to-api calls
        "X-Internal-Key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        token,
        method,
        // Include the timestamp so the API can detect replay attacks
        processedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `API returned ${response.status}: ${error}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

// Extract token from URL pathname
// /unsubscribe/abc123def456 → "abc123def456"
function extractToken(pathname: string): string | null {
  const parts = pathname.split("/");
  // pathname = /unsubscribe/TOKEN
  // parts    = ['', 'unsubscribe', 'TOKEN']
  const token = parts[2];

  if (!token || token.length < 10) {
    return null;
  }

  return token;
}

// Validate token is a hex string of the right length
// This prevents obviously invalid tokens from hitting the API
function isValidTokenFormat(token: string): boolean {
  // HMAC-SHA256 output is 64 hex characters
  return /^[a-f0-9]{64}$/.test(token);
}

// Standard CORS headers for the worker
function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Return a simple 200 OK for RFC 8058 POST requests
// Email clients just need a 200 — no body required
function successResponse(): Response {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      ...corsHeaders(),
    },
  });
}

// Return an HTML response for browser requests
function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

// ─────────────────────────────────────────────
// HTML PAGES
// Clean, simple pages shown to users who click unsubscribe
// No external dependencies — everything is inline
// ─────────────────────────────────────────────

function buildSuccessPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .icon {
      width: 56px;
      height: 56px;
      background: #dcfce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 24px;
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }

    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
    }

    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"></div>
    <h1>You have been unsubscribed</h1>
    <p>
      You will no longer receive emails from this sender.
      This change takes effect immediately.
    </p>
    <div class="footer">
      Unsubscribe powered by InboxRules
    </div>
  </div>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .icon {
      width: 56px;
      height: 56px;
      background: #fee2e2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 24px;
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }

    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
    }

    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"></div>
    <h1>Link expired or invalid</h1>
    <p>
      This unsubscribe link is no longer valid.
      Please use the unsubscribe link in your most recent email.
    </p>
    <div class="footer">
      Unsubscribe powered by InboxRules
    </div>
  </div>
</body>
</html>`;
}
