var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-I8gXpW/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/index.ts
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.method === "POST" && pathname.startsWith("/unsubscribe/")) {
      return handleOneClickUnsubscribe(request, env, pathname);
    }
    if (request.method === "GET" && pathname.startsWith("/unsubscribe/")) {
      return handleManualUnsubscribe(request, env, pathname);
    }
    if (request.method === "GET" && pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "inboxrules-unsub" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
async function handleOneClickUnsubscribe(request, env, pathname) {
  const token = extractToken(pathname);
  if (!token) {
    return successResponse();
  }
  let body = "";
  try {
    body = await request.text();
  } catch {
  }
  const isValidOneClickRequest = body.includes("List-Unsubscribe=One-Click") || body === "";
  if (!isValidOneClickRequest) {
    console.log("[Unsub] Unexpected POST body:", body.substring(0, 100));
  }
  const result = await processUnsubscribe(token, env, "one_click");
  if (!result.success) {
    console.error("[Unsub] One-click failed:", result.error);
    return successResponse();
  }
  return successResponse();
}
__name(handleOneClickUnsubscribe, "handleOneClickUnsubscribe");
async function handleManualUnsubscribe(request, env, pathname) {
  const token = extractToken(pathname);
  if (!token) {
    return htmlResponse(buildErrorPage("Invalid unsubscribe link"));
  }
  const result = await processUnsubscribe(token, env, "manual_click");
  if (!result.success) {
    console.error("[Unsub] Manual unsubscribe failed:", result.error);
  }
  return htmlResponse(buildSuccessPage());
}
__name(handleManualUnsubscribe, "handleManualUnsubscribe");
async function processUnsubscribe(token, env, method) {
  if (!isValidTokenFormat(token)) {
    return { success: false, error: "Invalid token format" };
  }
  try {
    const response = await fetch(`${env.API_URL}/internal/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal API key authenticates worker-to-api calls
        "X-Internal-Key": env.INTERNAL_API_KEY
      },
      body: JSON.stringify({
        token,
        method,
        // Include the timestamp so the API can detect replay attacks
        processedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `API returned ${response.status}: ${error}`
      };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}
__name(processUnsubscribe, "processUnsubscribe");
function extractToken(pathname) {
  const parts = pathname.split("/");
  const token = parts[2];
  if (!token || token.length < 10) {
    return null;
  }
  return token;
}
__name(extractToken, "extractToken");
function isValidTokenFormat(token) {
  return /^[a-f0-9]{64}$/.test(token);
}
__name(isValidTokenFormat, "isValidTokenFormat");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");
function successResponse() {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      ...corsHeaders()
    }
  });
}
__name(successResponse, "successResponse");
function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders()
    }
  });
}
__name(htmlResponse, "htmlResponse");
function buildSuccessPage() {
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
__name(buildSuccessPage, "buildSuccessPage");
function buildErrorPage(message) {
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
__name(buildErrorPage, "buildErrorPage");

// ../../node_modules/.pnpm/wrangler@4.90.1_@cloudflare+workers-types@4.20260511.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/.pnpm/wrangler@4.90.1_@cloudflare+workers-types@4.20260511.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-I8gXpW/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/.pnpm/wrangler@4.90.1_@cloudflare+workers-types@4.20260511.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-I8gXpW/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
