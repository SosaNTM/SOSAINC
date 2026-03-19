import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { getNotificationsForUser, getNotificationIcon, type AppNotification } from "@/lib/notificationStore";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bellAnimate, setBellAnimate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const items = getNotificationsForUser(user.id);
      setNotifications(items);
      if (items.some((n) => !n.isRead)) {
        setBellAnimate(true);
        const t = setTimeout(() => setBellAnimate(false), 600);
        return () => clearTimeout(t);
      }
    }
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const newItems = notifications.filter((n) => !n.isRead);
  const earlierItems = notifications.filter((n) => n.isRead);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const clickNotification = (n: AppNotification) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setOpen(false);
    navigate(n.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative"
        style={{ color: "var(--text-muted)", animation: bellAnimate ? "bellShake 0.5s ease" : "none" }}
      >
        <Bell className="h-5 w-5" style={{ strokeWidth: 1.7 }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1.5 flex items-center justify-center"
            style={{
              minWidth: 16, height: 16, borderRadius: 99,
              background: "#f43f5e", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "0 4px",
              animation: "customPulse 2s infinite",
              border: "2px solid var(--header-bg)",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[380px] max-w-[calc(100vw-32px)] max-h-[480px] overflow-y-auto z-[60]"
          style={{
            background: "var(--glass-bg-opaque, var(--glass-bg))",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "0.5px solid var(--glass-border)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            padding: 16,
            animation: "modalIn 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Notifications</span>
            {unreadCount > 0 && (
              <button type="button"
                onClick={markAllRead}
                style={{ fontSize: 12, color: "var(--accent-color)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* New */}
          {newItems.length > 0 && (
            <>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-quaternary)", display: "block", marginBottom: 6 }}>
                New
              </span>
              {newItems.map((n) => (
                <NotificationRow key={n.id} notification={n} onClick={() => clickNotification(n)} />
              ))}
            </>
          )}

          {/* Earlier */}
          {earlierItems.length > 0 && (
            <>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-quaternary)", display: "block", margin: "10px 0 6px" }}>
                Earlier
              </span>
              {earlierItems.map((n) => (
                <NotificationRow key={n.id} notification={n} onClick={() => clickNotification(n)} />
              ))}
            </>
          )}

          {notifications.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 24 }}>No notifications</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification: n, onClick }: { notification: AppNotification; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      className="flex items-start gap-2.5 w-full text-left transition-colors"
      style={{
        padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
        background: "transparent", marginBottom: 2,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Dot */}
      <span
        className="shrink-0 mt-1.5"
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: n.isRead ? "var(--glass-border)" : "var(--accent-color)",
        }}
      />
      {/* Icon */}
      <span className="shrink-0" style={{ fontSize: 16, lineHeight: "20px" }}>{getNotificationIcon(n.type)}</span>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600, color: "var(--text-primary)" }} className="truncate">
          {n.title}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }} className="truncate">{n.body}</p>
        <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2 }}>
          {formatDistanceToNow(n.createdAt, { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
