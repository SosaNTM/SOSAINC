import type { IssueStatus } from "@/lib/linearStore";

const SIZE = 14;

export function StatusIcon({ status, size = SIZE }: { status: IssueStatus; size?: number }) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  switch (status) {
    case "backlog":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} stroke="#6b7280" strokeWidth={1.5} strokeDasharray="2 2" />
        </svg>
      );
    case "todo":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} stroke="#d1d5db" strokeWidth={1.5} />
        </svg>
      );
    case "in_progress":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} stroke="#eab308" strokeWidth={1.5} />
          <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r}`} fill="#eab308" />
        </svg>
      );
    case "in_review":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} fill="#3b82f6" />
        </svg>
      );
    case "done":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} fill="#22c55e" />
          <path d={`M ${size * 0.28} ${cy} L ${size * 0.44} ${size * 0.64} L ${size * 0.72} ${size * 0.36}`} stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cancelled":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={cx} cy={cy} r={r} fill="#ef4444" />
          <path d={`M ${size * 0.35} ${size * 0.35} L ${size * 0.65} ${size * 0.65}`} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
          <path d={`M ${size * 0.65} ${size * 0.35} L ${size * 0.35} ${size * 0.65}`} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
  }
}
