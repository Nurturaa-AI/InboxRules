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

  // A browser form submit (our confirmation page) accepts HTML; a mail server
  // doing true RFC 8058 one-click does not. Record the method accordingly.
  const method = wantsHtml(request) ? "manual_click" : "one_click";

  // Verify the token is valid and record the unsubscribe
  const result = await processUnsubscribe(token, env, method);

  if (!result.success) {
    // Return 200 regardless — email clients should not retry on failure
    // Log the error internally for debugging
    console.error("[Unsub] One-click failed:", result.error);
  }

  // A browser confirmation form (see the GET page) sends Accept: text/html and
  // expects a human-readable page. Mail servers doing RFC 8058 one-click just
  // need a 200. Branch the response on what the client accepts.
  if (wantsHtml(request)) {
    return htmlResponse(buildSuccessPage());
  }

  return successResponse();
}

// ─────────────────────────────────────────────
// MANUAL UNSUBSCRIBE HANDLER (GET)
// Called when a user clicks the regular unsubscribe link in a browser.
//
// IMPORTANT (RFC 8058 §3.2): a GET MUST NOT perform the unsubscribe. Mail
// clients, link scanners, and prefetchers issue GETs on links, which would
// silently unsubscribe recipients. So GET only renders a confirmation page;
// the actual state change happens when the user submits the form, which POSTs
// back to this same URL and lands in handleOneClickUnsubscribe above.
// ─────────────────────────────────────────────

async function handleManualUnsubscribe(
  _request: Request,
  _env: Env,
  pathname: string,
): Promise<Response> {
  const token = extractToken(pathname);

  if (!token || !isValidTokenFormat(token)) {
    return htmlResponse(buildErrorPage("Invalid unsubscribe link"));
  }

  // Render the confirmation page only — no unsubscribe is performed here.
  return htmlResponse(buildConfirmPage(token));
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

  // Bound the API call so we always answer within the RFC 8058 10s budget,
  // even if the backend is slow or hung. 5s leaves headroom for the response.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

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
      signal: controller.signal,
    });

    if (!response.ok) {
      // Do not surface the backend's response body to the caller — it may leak
      // internal detail. Log the status only.
      return {
        success: false,
        error: `API returned ${response.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    const reason = err?.name === "AbortError" ? "timeout" : err?.message;
    return { success: false, error: `Network error: ${reason}` };
  } finally {
    clearTimeout(timeout);
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

// Check if the client wants HTML (browser) vs plain text (mail server)
function wantsHtml(request: Request): boolean {
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html");
}

// Escape HTML entities to prevent XSS if dynamic content is ever rendered
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// Confirmation page shown on GET. Submitting the form POSTs to the same URL,
// which is what actually performs the unsubscribe (RFC 8058: GET must not).
function buildConfirmPage(token: string): string {
  // token is validated as 64-char hex before we get here, but escape it anyway
  // as defence-in-depth since it is interpolated into an HTML attribute.
  const safeToken = escapeHtml(token);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Unsubscribe</title>
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
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 24px;
    }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    p { font-size: 15px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
    button {
      font: inherit;
      font-size: 15px;
      font-weight: 600;
      color: white;
      background: #dc2626;
      border: none;
      border-radius: 8px;
      padding: 12px 28px;
      cursor: pointer;
    }
    button:hover { background: #b91c1c; }
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
    <h1>Confirm unsubscribe</h1>
    <p>
      Click the button below to stop receiving emails from this sender.
    </p>
    <form method="POST" action="/unsubscribe/${safeToken}">
      <input type="hidden" name="List-Unsubscribe" value="One-Click">
      <button type="submit">Unsubscribe me</button>
    </form>
    <div class="footer">
      Unsubscribe powered by InboxRules
    </div>
  </div>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  const safeMessage = escapeHtml(message);
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
    <h1>${safeMessage}</h1>
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
