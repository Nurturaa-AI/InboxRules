// Shown when a list or table has no data

interface Props {
  icon: string;
  title: string;
  description: string;
  action?: { label: string };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 40 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
        {title}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-3)",
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {description}
      </p>
      {action && (
        <button
          style={{
            marginTop: 8,
            height: 36,
            padding: "0 16px",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: "white",
            border: "none",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
