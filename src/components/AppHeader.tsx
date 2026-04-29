import { useState, useRef, useEffect, useMemo } from "react";
import { STORAGE_AVATAR_PREFIX } from "@/constants/storageKeys";
import {
  Menu, Search, X, LogOut, Bell, ChevronDown,
  LayoutDashboard, BarChart3, PieChart, ArrowLeftRight, Layers,
  SlidersHorizontal, FileText, Lock, Cloud, CheckSquare, StickyNote,
  ShieldCheck, Settings, User, TrendingUp, Radio, FileImage, Users, Swords,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchAll, GROUP_ORDER, MAX_PER_GROUP, type SearchEntry, type SearchGroup } from "@/lib/searchIndex";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { UserAvatar } from "@/components/UserAvatar";
import { LogoLockup } from "@/components/sosa/LogoLockup";

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
      className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-5"
      style={{
        background:   "var(--sosa-bg)",
        borderBottom: "1px solid var(--sosa-border)",
        height:       56,
      }}
    >
      {/* Mobile hamburger */}
      <div className="shrink-0 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          style={{
            width: 36, height: 36, display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0, background: "transparent",
            border: "1px solid var(--sosa-border)", cursor: "pointer", borderRadius: 0,
          }}
        >
          <Menu className="h-4 w-4" style={{ color: "var(--sosa-white-70)", strokeWidth: 1.7 }} />
        </button>
      </div>

      {/* Left — LogoLockup (desktop) */}
      <div className="hidden md:flex items-center" style={{ minWidth: 0 }}>
        <LogoLockup workspace={portal?.id ?? "sosa"} />
      </div>

      {/* Center — search bar */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[480px] hidden md:block">
          <div className="relative">
            <div
              className="flex items-center gap-2.5 px-3 h-9"
              style={{
                background:   "var(--sosa-bg-2)",
                border:       `1px solid ${open ? "var(--sosa-yellow)" : "var(--sosa-border)"}`,
                transition:   "border-color var(--duration-fast) var(--ease-sharp)",
              }}
            >
              <Search style={{ width: 13, height: 13, color: "var(--sosa-white-40)", flexShrink: 0, strokeWidth: 2 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="→ search everything"
                className="flex-1 bg-transparent outline-none"
                style={{
                  fontFamily:  "var(--font-mono)",
                  fontSize:    12,
                  color:       "var(--sosa-white)",
                  caretColor:  "var(--sosa-yellow)",
                }}
              />
              {query ? (
                <button type="button"
                  onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2, background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <X style={{ width: 11, height: 11, color: "var(--sosa-white-40)", strokeWidth: 2 }} />
                </button>
              ) : (
                <span
                  style={{
                    fontFamily:  "var(--font-mono)",
                    fontSize:    10,
                    color:       "var(--sosa-white-20)",
                    border:      "1px solid var(--sosa-border)",
                    padding:     "1px 5px",
                    letterSpacing: "0.05em",
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
                className="absolute top-full mt-1 w-full overflow-hidden py-1"
                style={{
                  background:   "var(--sosa-bg-3)",
                  border:       "1px solid var(--sosa-border)",
                  maxHeight:    "min(400px, 55vh)",
                  overflowY:    "auto",
                  zIndex:       200,
                }}
              >
                {grouped.length === 0 ? (
                  <div className="py-5 text-center">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sosa-white-40)", textTransform: "uppercase", letterSpacing: "0.10em" }}>
                      NO RESULTS — "{query}"
                    </span>
                  </div>
                ) : (
                  grouped.map(({ group, items }) => {
                    const groupColor = GROUP_COLORS[group];
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                          <div style={{ width: 5, height: 5, background: groupColor, flexShrink: 0 }} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sosa-white-40)" }}>
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
                              style={{ background: isActive ? "var(--sosa-bg-2)" : "transparent", borderLeft: isActive ? "2px solid var(--portal-accent)" : "2px solid transparent" }}
                            >
                              <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{ width: 24, height: 24, background: "var(--sosa-bg)", border: "1px solid var(--sosa-border)" }}
                              >
                                {Icon ? (
                                  <Icon style={{ width: 12, height: 12, color: groupColor, strokeWidth: 1.7 }} />
                                ) : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--sosa-white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {entry.title}
                                </p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sosa-white-40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  {entry.subtitle}
                                </p>
                              </div>

                              {entry.badge && badgeStyle && (
                                <span
                                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", background: badgeStyle.bg, color: badgeStyle.color, flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}
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
                  <div className="flex items-center gap-3 px-3 py-2 mt-1" style={{ borderTop: "1px solid var(--sosa-border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sosa-white-20)", textTransform: "uppercase", letterSpacing: "0.08em" }}>↑↓ navigate</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sosa-white-20)", textTransform: "uppercase", letterSpacing: "0.08em" }}>↵ open</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sosa-white-20)", textTransform: "uppercase", letterSpacing: "0.08em" }}>esc close</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side — bell + user */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <button
          type="button"
          className="relative flex items-center justify-center"
          style={{ width: 34, height: 34, background: "transparent", border: "1px solid var(--sosa-border)", cursor: "pointer" }}
        >
          <Bell style={{ width: 16, height: 16, color: "var(--sosa-white-70)", strokeWidth: 1.7 }} />
          <span className="absolute top-1.5 right-1.5" style={{ width: 5, height: 5, background: "var(--color-error)", borderRadius: "50%" }} />
        </button>

        {/* User */}
        {user && (
          <div ref={profileRef} className="shrink-0 relative">
            <button
              type="button"
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 px-2 py-1"
              style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", cursor: "pointer" }}
            >
              <UserAvatar user={{ ...user, avatar: localAvatar || user.avatar }} size={26} />
              <span className="hidden md:inline" style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--sosa-white-70)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {user.displayName}
              </span>
              <ChevronDown style={{ width: 12, height: 12, color: "var(--sosa-white-40)" }} />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 py-1"
                style={{
                  width:      220,
                  background: "var(--sosa-bg-3)",
                  border:     "1px solid var(--sosa-border)",
                }}
              >
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "1px solid var(--sosa-border)" }}>
                  <UserAvatar user={{ ...user, avatar: localAvatar || user.avatar }} size={36} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--sosa-white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.displayName}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--sosa-white-40)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {user.role ?? "member"}
                    </p>
                  </div>
                </div>

                <div className="py-1">
                  {[
                    { label: "View Profile →", icon: User, action: () => { navigate(prefix + "/profile"); setProfileOpen(false); } },
                    { label: "Settings →",     icon: Settings, action: () => { navigate(prefix + "/settings"); setProfileOpen(false); } },
                  ].map(({ label, icon: Icon, action }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      className="flex items-center gap-3 w-full text-left px-3 py-2"
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sosa-white-70)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sosa-bg-2)"; e.currentTarget.style.borderLeft = "2px solid var(--portal-accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeft = "2px solid transparent"; }}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sosa-white-40)" }} />
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: "var(--sosa-border)" }} />

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { logout(); navigate("/login"); }}
                    className="flex items-center gap-3 w-full text-left px-3 py-2"
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,45,85,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    Log Out →
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
