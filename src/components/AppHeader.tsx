import { useState, useRef, useEffect, useMemo } from "react";
import { STORAGE_AVATAR_PREFIX } from "@/constants/storageKeys";
import {
  Menu, Search, X, LogOut, Bell, ChevronDown, ArrowLeft,
  LayoutDashboard, BarChart3, PieChart, ArrowLeftRight, Layers,
  SlidersHorizontal, FileText, Lock, Cloud, CheckSquare, StickyNote,
  ShieldCheck, Settings, User, TrendingUp, Radio, FileImage, Users, Swords,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchAll, GROUP_ORDER, MAX_PER_GROUP, type SearchEntry, type SearchGroup } from "@/lib/searchIndex";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { UserAvatar } from "@/components/UserAvatar";

interface AppHeaderProps {
  onMenuClick: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  User, LayoutDashboard, BarChart3, PieChart, ArrowLeftRight, Layers,
  SlidersHorizontal, FileText, Lock, Cloud, CheckSquare, StickyNote,
  ShieldCheck, Settings, TrendingUp, Radio, FileImage, Users, Swords,
};

const GROUP_COLORS: Record<SearchGroup, string> = {
  Pages: "#60a5fa",
  "Cloud Files": "#34d399",
  Vault: "#a78bfa",
  Tasks: "#f59e0b",
  Notes: "#fb923c",
  Invoices: "#6ee7b7",
  Transactions: "#f472b6",
};

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  Overdue: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  Urgent: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  Locked: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { portal } = usePortal();
  const prefix = portal ? portal.routePrefix : '';

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(STORAGE_AVATAR_PREFIX + user.id);
    if (stored) setLocalAvatar(stored);
  }, [user?.id]);

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem(STORAGE_AVATAR_PREFIX + user?.id);
      setLocalAvatar(stored ?? null);
    };
    window.addEventListener("storage", handler);
    window.addEventListener("avatar-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("avatar-changed", handler);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // Grouped results — max MAX_PER_GROUP per group, groups ordered by GROUP_ORDER
  const grouped = useMemo(() => {
    const raw = searchAll(query);
    const byGroup: Record<string, SearchEntry[]> = {};
    for (const entry of raw) {
      if (!byGroup[entry.group]) byGroup[entry.group] = [];
      if (byGroup[entry.group].length < MAX_PER_GROUP) byGroup[entry.group].push(entry);
    }
    return GROUP_ORDER.filter((g) => byGroup[g]?.length).map((g) => ({ group: g, items: byGroup[g] }));
  }, [query]);

  // Flat list for keyboard navigation
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const handleSelect = (entry: SearchEntry) => {
    navigate(prefix + entry.path);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flat[activeIdx]) {
        handleSelect(flat[activeIdx]);
      } else if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flat, activeIdx, handleSelect]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && query.trim().length > 0;
  let flatCursor = 0;

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 md:h-20"
      style={{
        background: "transparent",
      }}
    >
      {/* Left — hamburger (mobile only) + greeting */}
      <div className="shrink-0 lg:hidden">
        <button type="button"
          onClick={onMenuClick}
          className="glass-btn"
          style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >
          <Menu className="h-5 w-5" style={{ color: "var(--text-primary)", strokeWidth: 1.7 }} />
        </button>
      </div>

      {/* Left — greeting */}
      <div className="hidden md:flex flex-col" style={{ minWidth: 0, maxWidth: 280 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Hi, {user?.displayName || 'there'}! 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          Welcome to your Workspace
        </p>
      </div>

      {/* Center — search bar */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[480px] hidden md:block">
          <div className="relative">
            <div
              className="flex items-center gap-2.5 px-3.5 h-10 rounded-xl transition-all duration-200"
              style={{
                background: open ? "var(--glass-bg-hover)" : "var(--glass-bg)",
                border: open ? "1px solid var(--glass-border-strong)" : "1px solid var(--glass-border)",
                boxShadow: open ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Search style={{ width: 14, height: 14, color: "var(--text-quaternary)", flexShrink: 0, strokeWidth: 2 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search everything…"
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[var(--text-quaternary)]"
                style={{ color: "var(--text-primary)", caretColor: "var(--accent-color)" }}
              />
              {query ? (
                <button type="button"
                  onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}
                >
                  <X style={{ width: 12, height: 12, color: "var(--text-quaternary)", strokeWidth: 2 }} />
                </button>
              ) : (
                <span
                  className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: "var(--text-quaternary)",
                    background: "var(--glass-bg-subtle)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  ⌘K
                </span>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute top-full mt-2 w-full rounded-xl overflow-hidden py-1.5"
                style={{
                  background: "var(--modal-bg)",
                  border: "1px solid var(--glass-border-strong)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                  backdropFilter: "blur(40px)",
                  maxHeight: "min(400px, 55vh)",
                  overflowY: "auto",
                }}
              >
                {grouped.length === 0 ? (
                  <div className="py-5 text-center">
                    <span className="text-[13px]" style={{ color: "var(--text-quaternary)" }}>No results for "{query}"</span>
                  </div>
                ) : (
                  grouped.map(({ group, items }) => {
                    const groupColor = GROUP_COLORS[group];
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: groupColor, flexShrink: 0 }} />
                          <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-quaternary)" }}>
                            {group}
                          </span>
                        </div>

                        {items.map((entry) => {
                          const globalIdx = flatCursor++;
                          const isActive = globalIdx === activeIdx;
                          const Icon = entry.iconName ? ICON_MAP[entry.iconName] : null;
                          const badgeStyle = entry.badge ? BADGE_COLORS[entry.badge] : null;

                          return (
                            <button type="button"
                              key={entry.id}
                              onMouseEnter={() => setActiveIdx(globalIdx)}
                              onMouseDown={() => handleSelect(entry)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left"
                              style={{ background: isActive ? "var(--nav-hover-bg)" : "transparent" }}
                            >
                              <div
                                className="flex items-center justify-center flex-shrink-0 text-[13px]"
                                style={{ width: 28, height: 28, borderRadius: 8, background: "var(--glass-bg-subtle)" }}
                              >
                                {entry.emoji ? (
                                  <span>{entry.emoji}</span>
                                ) : Icon ? (
                                  <Icon style={{ width: 13, height: 13, color: groupColor, strokeWidth: 1.7 }} />
                                ) : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                  {entry.title}
                                </p>
                                <p className="text-[11px] truncate" style={{ color: "var(--text-quaternary)" }}>
                                  {entry.subtitle}
                                </p>
                              </div>

                              {entry.badge && badgeStyle && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                                >
                                  {entry.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}

                {grouped.length > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2 mt-1" style={{ borderTop: "1px solid var(--divider)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>↑↓ navigate</span>
                    <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>↵ open</span>
                    <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>esc close</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side — bell + avatar pill */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell */}
        <button type="button" className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <Bell style={{ width: 20, height: 20, color: 'var(--text-primary)', strokeWidth: 1.7 }} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* User avatar pill */}
        {user && (
          <div ref={profileRef} className="shrink-0 relative">
            <button type="button"
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <UserAvatar user={{ ...user, avatar: localAvatar || user.avatar }} size={30} />
              <span className="hidden md:inline" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.displayName}</span>
              <span className="hidden lg:inline" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>- {user.role || 'Admin'}</span>
              <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-quaternary)' }} />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-2 rounded-2xl py-1 z-50"
                style={{
                  width: 230,
                  background: "var(--modal-bg)",
                  border: "1px solid var(--glass-border-strong)",
                  boxShadow: "var(--glass-shadow-lg)",
                  backdropFilter: "blur(40px)",
                }}
              >
                {/* User info header */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <UserAvatar user={{ ...user, avatar: localAvatar || user.avatar }} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {user.displayName}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--divider)", margin: "0 0" }} />

                <div className="px-1.5 py-1.5">
                  <button type="button"
                    onClick={() => { navigate(prefix + "/profile"); setProfileOpen(false); }}
                    className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 transition-colors"
                    style={{ color: "var(--text-primary)", fontSize: 13 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <User className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    View Profile
                  </button>
                  <button type="button"
                    onClick={() => { navigate(prefix + "/settings"); setProfileOpen(false); }}
                    className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 transition-colors"
                    style={{ color: "var(--text-primary)", fontSize: 13 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Settings className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    Settings
                  </button>
                </div>

                <div style={{ height: 1, background: "var(--divider)" }} />

                <div className="px-1.5 py-1.5">
                  <button type="button"
                    onClick={() => { logout(); navigate("/login"); }}
                    className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 transition-colors"
                    style={{ color: "#f87171", fontSize: 13 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
