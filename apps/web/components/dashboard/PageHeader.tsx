// Reusable page header with title, description, and optional action button

interface Props {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  badge?: {
    label: string;
    color: string;
  };
}

export default function PageHeader({
  title,
  description,
  action,
  badge,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.4px",
            }}
          >
            {title}
          </h1>
          {badge && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                background: badge.color + "20",
                color: badge.color,
              }}
            >
              {badge.label}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5 }}>
          {description}
        </p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2"
          style={{
            height: 38,
            padding: "0 16px",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
