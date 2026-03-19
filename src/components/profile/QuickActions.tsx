import { FileText, Users, Package, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ACTIONS = [
  { icon: <FileText className="w-4 h-4" />, label: "New Invoice", path: "/invoices", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  { icon: <Users className="w-4 h-4" />, label: "Add Client", path: "/channels", color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  { icon: <Package className="w-4 h-4" />, label: "Add Product", path: "/channels", color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
  { icon: <BarChart3 className="w-4 h-4" />, label: "View Reports", path: "/dashboard", color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTIONS.map((action) => (
        <button type="button"
          key={action.label}
          onClick={() => navigate(action.path)}
          className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-[var(--radius-md)] transition-all duration-150 hover:-translate-y-0.5"
          style={{ background: "var(--glass-bg-subtle)", border: "1px solid var(--glass-border-subtle)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--glass-bg-hover)";
            e.currentTarget.style.borderColor = "var(--glass-border-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--glass-bg-subtle)";
            e.currentTarget.style.borderColor = "var(--glass-border-subtle)";
          }}
        >
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: action.bg, color: action.color }}>
            {action.icon}
          </div>
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
