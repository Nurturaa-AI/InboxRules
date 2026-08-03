"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onDomainAdded: (domain: Domain) => void;
}

interface DKIMRecord {
  selector: string;
  keyBits: number;
  valid?: boolean;
}

interface DNSResult {
  spf?: { lookupCount?: number; result?: string; record?: string };
  dkim?: DKIMRecord[];
  dmarc?: { policy?: string; result?: string; record?: string };
  softFailures?: string[];
  overallScore?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

interface Domain {
  id: string;
  domain: string;
  createdAt?: string;
  [key: string]: unknown;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
  const circumference = 2 * Math.PI * 28;
  const progress = (score / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "monospace",
            color,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}>
          /100
        </span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle size={16} color="#10B981" />;
  if (status === "fail" || status === "none" || status === "missing")
    return <XCircle size={16} color="#EF4444" />;
  return <AlertCircle size={16} color="#F59E0B" />;
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          style={{
            height: 4,
            width: s <= step ? 28 : 16,
            borderRadius: 999,
            background:
              s <= step
                ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                : "#E2E8F0",
            transition: "all 0.3s",
          }}
        />
      ))}
    </div>
  );
}

export default function AddDomainWizard({ onClose, onDomainAdded }: Props) {
  const { getToken } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedDomain, setAddedDomain] = useState<Domain | null>(null);
  const [dnsResult, setDnsResult] = useState<DNSResult | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState({
    spfDone: false,
    dkimDone: false,
    dmarcDone: false,
    aiDone: false,
  });

  // Clean the domain input
  function cleanDomain(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\s/g, "");
  }

  // Step 1 → 2: Add domain then stream analysis
  async function handleAddDomain() {
    const cleaned = cleanDomain(domain);
    if (!cleaned || !cleaned.includes(".")) {
      setError("Please enter a valid domain e.g. acme.com");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }

      // 1. Add domain to database
      const addResponse = await fetch(`${API_URL}/api/v1/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: cleaned }),
      });

      const addData = await addResponse.json();

      if (!addResponse.ok) {
        throw new Error(addData.error?.message || "Failed to add domain");
      }

      setAddedDomain(addData.data);
      setStep(2);
      setLoading(false);

      // 2. Start streaming DNS analysis
      startAnalysis(cleaned, token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? "");
      setError(msg || "Failed to add domain. Please try again.");
      setLoading(false);
    }
  }

  // Stream DNS analysis via SSE
  async function startAnalysis(domainName: string, token: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/ai/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ domain: domainName }),
      });

      if (!response.ok || !response.body) {
        // Even if AI fails, mark scan complete so user can proceed
        setScanComplete(true);
        setProgress({
          spfDone: true,
          dkimDone: true,
          dmarcDone: true,
          aiDone: true,
        });
        setTimeout(() => setStep(3), 800);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          if (!message.trim()) continue;

          const lines = message.split("\n");
          let event = "message";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.substring(7).trim();
            if (line.startsWith("data: ")) data = line.substring(6).trim();
          }

          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (event === "dns_result") {
              setDnsResult(parsed);
              setProgress((p) => ({
                ...p,
                spfDone: true,
                dkimDone: true,
                dmarcDone: true,
              }));
            }
            if (event === "ai_token") {
              aiText += parsed.token || "";
              setAiDiagnosis(aiText);
            }
            if (event === "done") {
              setProgress((p) => ({ ...p, aiDone: true }));
              setScanComplete(true);
              setTimeout(() => setStep(3), 600);
            }
            if (event === "error") {
              setScanComplete(true);
              setProgress((p) => ({ ...p, aiDone: true }));
              setTimeout(() => setStep(3), 600);
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch {
      // Network error — still advance
      setScanComplete(true);
      setProgress({
        spfDone: true,
        dkimDone: true,
        dmarcDone: true,
        aiDone: true,
      });
      setTimeout(() => setStep(3), 800);
    }
  }

  function copyHeaders() {
    if (!addedDomain) return;
    const text =
      `List-Unsubscribe: <https://unsub.inboxrules.io/${addedDomain.id}>, ` +
      `<mailto:unsubscribe@${domain}?subject=unsubscribe>\n` +
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const score = dnsResult?.overallScore ?? 0;
  const scoreColor =
    score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  // ─── Shared styles ───
  const card: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 16,
  };

  const btn = (primary?: boolean): React.CSSProperties => ({
    height: 40,
    padding: "0 20px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    border: primary ? "none" : "1px solid #E2E8F0",
    background: primary
      ? "linear-gradient(135deg, #2563EB, #7C3AED)"
      : "#F8FAFC",
    color: primary ? "white" : "#475569",
    display: "flex",
    alignItems: "center",
    gap: 6,
  });

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
    >
      {/* Modal — solid white background, no transparency */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.3px",
                margin: 0,
              }}
            >
              {step === 1 && "Add New Domain"}
              {step === 2 && "Running Compliance Scan"}
              {step === 3 && "Compliance Report"}
              {step === 4 && "All Set!"}
            </h2>
            <StepDots step={step} />
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              cursor: "pointer",
              color: "#94A3B8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            background: "#FFFFFF",
          }}
        >
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p
                style={{
                  fontSize: 14,
                  color: "#475569",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Enter your sending domain and we will run a full SPF, DKIM, and
                DMARC compliance check instantly.
              </p>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Domain Name
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  placeholder="e.g. acme.com"
                  autoFocus
                  style={{
                    width: "100%",
                    height: 46,
                    padding: "0 16px",
                    background: error ? "#FFF5F5" : "#F8FAFC",
                    border: `1.5px solid ${error ? "#EF4444" : "#E2E8F0"}`,
                    borderRadius: 11,
                    fontSize: 15,
                    color: "#0F172A",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    if (!error) e.target.style.borderColor = "#2563EB";
                  }}
                  onBlur={(e) => {
                    if (!error) e.target.style.borderColor = "#E2E8F0";
                  }}
                />
                {error && (
                  <p style={{ fontSize: 12.5, color: "#EF4444", marginTop: 6 }}>
                    {error}
                  </p>
                )}
              </div>

              {/* What we check */}
              <div style={{ ...card, background: "#F8FAFC" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94A3B8",
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  What we check
                </p>
                {[
                  {
                    icon: "📋",
                    label: "SPF Record",
                    desc: "Validates lookup count and alignment",
                  },
                  {
                    icon: "🔑",
                    label: "DKIM Selectors",
                    desc: "Checks 16 common selectors automatically",
                  },
                  {
                    icon: "🛡️",
                    label: "DMARC Policy",
                    desc: "Validates policy and reporting setup",
                  },
                  {
                    icon: "🤖",
                    label: "AI Diagnosis",
                    desc: "Plain-English explanation with fix steps",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "#94A3B8",
                          marginLeft: 6,
                        }}
                      >
                        — {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2 — Scanning ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Domain badge */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#2563EB",
                    animation: "pulse 1s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#1E40AF",
                    fontFamily: "monospace",
                  }}
                >
                  {cleanDomain(domain)}
                </span>
                <span style={{ fontSize: 12, color: "#3B82F6" }}>
                  — scanning in progress
                </span>
              </div>

              {/* Check rows */}
              <div style={card}>
                {[
                  {
                    done: progress.spfDone,
                    label: "SPF Record",
                    status: dnsResult?.spf?.result,
                    detail: `${dnsResult?.spf?.lookupCount || 0}/10 lookups`,
                  },
                  {
                    done: progress.dkimDone,
                    label: "DKIM",
                    status: dnsResult?.dkim?.some((d: DKIMRecord) => d.valid)
                      ? "pass"
                      : "fail",
                    detail: `${dnsResult?.dkim?.length || 0} selector(s) found`,
                  },
                  {
                    done: progress.dmarcDone,
                    label: "DMARC Policy",
                    status: dnsResult?.dmarc?.result,
                    detail: `p=${dnsResult?.dmarc?.policy || "?"}`,
                  },
                  {
                    done: progress.aiDone,
                    label: "AI Analysis",
                    status: "info",
                    detail: "Generating fix instructions",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: i < 3 ? "1px solid #F1F5F9" : "none",
                    }}
                  >
                    {row.done ? (
                      <StatusIcon status={row.status || "unknown"} />
                    ) : (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid #E2E8F0",
                          borderTopColor: "#2563EB",
                          animation: "spin 1s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      >
                        {row.label}
                      </p>
                      {row.done && row.detail && (
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "#94A3B8",
                            fontFamily: "monospace",
                            marginTop: 2,
                          }}
                        >
                          {row.detail}
                        </p>
                      )}
                    </div>
                    {row.done ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background:
                            row.status === "pass"
                              ? "#DCFCE7"
                              : row.status === "fail"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                          color:
                            row.status === "pass"
                              ? "#16A34A"
                              : row.status === "fail"
                                ? "#DC2626"
                                : "#D97706",
                        }}
                      >
                        {row.status?.toUpperCase() || "DONE"}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        Checking...
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Soft failures */}
              {(dnsResult?.softFailures?.length ?? 0) > 0 && (
                <div
                  style={{
                    background: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#D97706",
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ Soft Failures Detected
                  </p>
                  {dnsResult?.softFailures?.map((w: string, i: number) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 12.5,
                        color: "#92400E",
                        marginBottom: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      · {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 — Report ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Score summary */}
              <div
                style={{
                  ...card,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: "#F8FAFC",
                }}
              >
                <ScoreRing score={score} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: scoreColor,
                      marginBottom: 4,
                    }}
                  >
                    {score >= 80
                      ? "Looking good!"
                      : score >= 60
                        ? "Needs attention"
                        : "Critical issues found"}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      fontFamily: "monospace",
                      color: "#475569",
                    }}
                  >
                    {cleanDomain(domain)}
                  </p>
                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    {[
                      { label: "SPF", status: dnsResult?.spf?.result },
                      {
                        label: "DKIM",
                        status: dnsResult?.dkim?.some((d: any) => d.valid)
                          ? "pass"
                          : "fail",
                      },
                      { label: "DMARC", status: dnsResult?.dmarc?.result },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <StatusIcon status={item.status || "unknown"} />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569",
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* DNS Details */}
              {dnsResult && (
                <div style={card}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94A3B8",
                      marginBottom: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Detailed Results
                  </p>
                  {[
                    {
                      label: `SPF — ${dnsResult.spf?.lookupCount || 0}/10 DNS lookups`,
                      status: dnsResult.spf?.result,
                      detail: dnsResult.spf?.record,
                    },
                    {
                      label: `DKIM — ${dnsResult.dkim?.length || 0} selector(s)`,
                      status: dnsResult.dkim?.some((d: unknown) => d.valid)
                        ? "pass"
                        : "fail",
                      detail: dnsResult.dkim
                        ?.map(
                          (d: { selector: string; keyBits: number }) =>
                            `${d.selector}(${d.keyBits}bit)`,
                        )
                        .join(", "),
                    },
                    {
                      label: `DMARC — p=${dnsResult.dmarc?.policy || "none"}`,
                      status: dnsResult.dmarc?.result,
                      detail: dnsResult.dmarc?.record,
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: i < 2 ? "1px solid #F1F5F9" : "none",
                      }}
                    >
                      <StatusIcon status={row.status || "unknown"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#0F172A",
                          }}
                        >
                          {row.label}
                        </p>
                        {row.detail && (
                          <p
                            style={{
                              fontSize: 11.5,
                              color: "#94A3B8",
                              fontFamily: "monospace",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Analysis */}
              {aiDiagnosis && (
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2563EB",
                      marginBottom: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    🤖 AI Analysis
                  </p>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: "#1E40AF",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {aiDiagnosis}
                  </div>
                </div>
              )}

              {/* Unsubscribe headers */}
              {addedDomain && (
                <div style={card}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0F172A",
                      marginBottom: 6,
                    }}
                  >
                    📧 Your List-Unsubscribe Headers
                  </p>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "#94A3B8",
                      marginBottom: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    Add these to every marketing email from{" "}
                    {cleanDomain(domain)} to comply with Gmail and Yahoo
                    requirements.
                  </p>
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      position: "relative",
                    }}
                  >
                    <code
                      style={{
                        fontSize: 11.5,
                        fontFamily: "monospace",
                        color: "#374151",
                        lineHeight: 1.8,
                        display: "block",
                        wordBreak: "break-all",
                        paddingRight: 32,
                      }}
                    >
                      List-Unsubscribe: &lt;https://unsub.inboxrules.io/
                      {addedDomain.id}&gt;, &lt;mailto:unsubscribe@
                      {cleanDomain(domain)}?subject=unsubscribe&gt;
                      <br />
                      List-Unsubscribe-Post: List-Unsubscribe=One-Click
                    </code>
                    <button
                      onClick={copyHeaders}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "1px solid #E2E8F0",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: copied ? "#10B981" : "#94A3B8",
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4 — Done ── */}
          {step === 4 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                padding: "20px 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 60 }}>🎉</div>
              <div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0F172A",
                    marginBottom: 8,
                  }}
                >
                  {cleanDomain(domain)} is now being monitored
                </h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
                  InboxRules will check your DNS records every 6 hours and alert
                  you immediately if anything changes or breaks.
                </p>
              </div>

              <div
                style={{
                  ...card,
                  width: "100%",
                  textAlign: "left",
                  background: "#F8FAFC",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94A3B8",
                    marginBottom: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Recommended next steps
                </p>
                {[
                  {
                    icon: "📧",
                    title: "Add unsubscribe headers",
                    desc: "Copy the List-Unsubscribe headers to your email templates",
                  },
                  {
                    icon: "🔔",
                    title: "Set up Slack alerts",
                    desc: "Get notified in Slack when something breaks",
                  },
                  {
                    icon: "📊",
                    title: "Invite your team",
                    desc: "Add team members to monitor domains together",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      >
                        {item.title}
                      </p>
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "#94A3B8",
                          marginTop: 2,
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F8FAFC",
          }}
        >
          <button
            onClick={
              step === 1
                ? onClose
                : () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)
            }
            style={btn()}
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          {step === 1 && (
            <button
              onClick={handleAddDomain}
              disabled={loading || !domain.trim()}
              style={{
                ...btn(true),
                opacity: loading || !domain.trim() ? 0.6 : 1,
                cursor: loading || !domain.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spin" /> Adding...
                </>
              ) : (
                <>
                  Start Scan <ArrowRight size={14} />
                </>
              )}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => scanComplete && setStep(3)}
              disabled={!scanComplete}
              style={{
                ...btn(true),
                opacity: !scanComplete ? 0.5 : 1,
                cursor: !scanComplete ? "not-allowed" : "pointer",
              }}
            >
              {scanComplete ? (
                <>
                  <ArrowRight size={14} />
                  View Report
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="spin" />
                  Scanning...
                </>
              )}
            </button>
          )}

          {step === 3 && (
            <button onClick={() => setStep(4)} style={btn(true)}>
              Continue <ArrowRight size={14} />
            </button>
          )}

          {step === 4 && (
            <button
              onClick={() => {
                onDomainAdded(addedDomain);
                onClose();
              }}
              style={{
                ...btn(true),
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              <CheckCircle size={14} /> Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
