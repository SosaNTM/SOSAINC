import type { User } from "@/lib/authContext";

interface UserAvatarProps {
  user: Pick<User, "avatar" | "displayName">;
  size?: number;
}

export function UserAvatar({ user, size = 36 }: UserAvatarProps) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.displayName}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, rgba(110,231,183,0.2), rgba(103,232,249,0.2))",
        border: "1px solid rgba(110,231,183,0.3)",
      }}
    >
      <span style={{ color: "var(--accent-color)", fontSize: size * 0.38, fontWeight: 700 }}>
        {user.displayName?.charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
