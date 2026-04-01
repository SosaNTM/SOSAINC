import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { STORAGE_AVATAR_PREFIX } from "@/constants/storageKeys";
import { UserAvatar } from "@/components/UserAvatar";
import { RoleBadge } from "@/components/RoleBadge";
import {
  User as UserIcon, Settings, LogOut, MoreVertical,
} from "lucide-react";
import type { Role } from "@/lib/permissions";

interface SidebarProfileWidgetProps {
  collapsed: boolean;
  onMobileClose: () => void;
}

export function SidebarProfileWidget({ collapsed, onMobileClose }: SidebarProfileWidgetProps) {
  const { user, logout } = useAuth();
  const { portal } = usePortal();
  const navigate = useNavigate();
  const prefix = portal ? portal.routePrefix : '';
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Read avatar from localStorage
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_AVATAR_PREFIX + user?.id);
    if (stored) setLocalAvatar(stored);
  }, [user?.id]);

  // Listen for avatar changes from profile page
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem(STORAGE_AVATAR_PREFIX + user?.id);
      setLocalAvatar(stored);
    };
    window.addEventListener("storage", handler);
    window.addEventListener("avatar-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("avatar-changed", handler);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const displayUser = { ...user, avatar: localAvatar || user.avatar };

  const go = (path: string) => { navigate(`${prefix}${path}`); onMobileClose(); setOpen(false); };

  const popover = (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-popover border border-border rounded-2xl p-4 shadow-xl"
      style={{
        bottom: collapsed ? "auto" : 72,
        top: collapsed ? 0 : "auto",
        left: collapsed ? 76 : 12,
        right: collapsed ? "auto" : 12,
        width: collapsed ? 260 : "auto",
        animation: "slideUp 0.2s ease",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar user={displayUser} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="mt-1"><RoleBadge role={user.role as Role} /></div>
        </div>
      </div>

      <div className="h-px bg-border my-2" />

      {/* Menu items */}
      <button type="button" onClick={() => go("/profile")}
        className="flex items-center gap-2.5 w-full text-left text-[13px] text-foreground rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors">
        <UserIcon className="w-4 h-4" /> View My Profile
      </button>
      <button type="button" onClick={() => go("/settings")}
        className="flex items-center gap-2.5 w-full text-left text-[13px] text-foreground rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors">
        <Settings className="w-4 h-4" /> Settings
      </button>

      <div className="h-px bg-border my-2" />

      {/* Logout */}
      <button type="button" onClick={() => { logout(); navigate("/login"); }}
        className="flex items-center gap-2.5 w-full text-left text-[13px] text-destructive rounded-lg px-2 py-2 hover:bg-destructive/10 transition-colors">
        <LogOut className="w-4 h-4" /> Log Out
      </button>
    </div>
  );

  return (
    <div className="px-3 pb-5 relative">
      {open && popover}
      <div
        className="flex items-center gap-3 cursor-pointer rounded-xl border border-border bg-muted/30 hover:bg-accent/30 transition-colors"
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: collapsed ? "10px 0" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div className="relative">
          <UserAvatar user={displayUser} size={collapsed ? 32 : 36} />
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-background" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{user.displayName}</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                <span className="text-[11px] text-muted-foreground">Online</span>
              </div>
            </div>
            <MoreVertical className="shrink-0 w-4 h-4 text-muted-foreground" />
          </>
        )}
      </div>
    </div>
  );
}
