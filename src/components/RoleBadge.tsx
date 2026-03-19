import type { Role } from "@/lib/permissions";

const ROLE_CONFIG: Record<Role, { bg: string; text: string; label: string; emoji: string }> = {
  owner: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Owner", emoji: "👑" },
  admin: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Admin", emoji: "🔧" },
  manager: { bg: "bg-purple-500/10", text: "text-purple-500", label: "Manager", emoji: "👥" },
  member: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Member", emoji: "👤" },
};

export function RoleBadge({ role }: { role: Role }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.member;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}
