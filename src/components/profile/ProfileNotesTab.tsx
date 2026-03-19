import { useState } from "react";
import { MOCK_NOTES, type ProfileNote } from "@/lib/profileData";
import { Lock, Pin, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TAG_COLORS: Record<string, string> = {
  meeting: "#60a5fa",
  personal: "#a78bfa",
  product: "#6ee7b7",
  idea: "#fbbf24",
  marketing: "#fb923c",
  ops: "#38bdf8",
  hr: "#f472b6",
  research: "#818cf8",
  design: "#c084fc",
  branding: "#e879f9",
  planning: "#34d399",
};

export function ProfileNotesTab({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const notes = MOCK_NOTES.filter((n) => n.userId === userId);
  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          My Notes ({notes.length})
        </h3>
        <button type="button"
          className="glass-btn-primary"
          style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8 }}
        >
          + New Note
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-quaternary)" }} />
        <input
          className="glass-input w-full"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 36, fontSize: 13, padding: "9px 12px 9px 36px" }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((note) => (
          <button type="button"
            key={note.id}
            className="text-left transition-all duration-200"
            style={{
              background: "var(--glass-bg)",
              border: "0.5px solid var(--glass-border)",
              borderRadius: 12,
              padding: "14px 16px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-color)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <div className="flex items-center gap-2 mb-1">
              {note.pinned && <Pin className="w-3.5 h-3.5" style={{ color: "var(--accent-color)" }} />}
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{note.title}</span>
              <Lock className="w-3 h-3 ml-auto" style={{ color: "var(--text-quaternary)" }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.4, marginBottom: 8 }} className="line-clamp-2">
              {note.preview}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: `${TAG_COLORS[tag] || "#888"}20`,
                    color: TAG_COLORS[tag] || "#888",
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
              <span style={{ fontSize: 11, color: "var(--text-quaternary)", marginLeft: "auto" }}>
                {formatDistanceToNow(note.createdAt, { addSuffix: true })}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 20 }}>No notes found</p>
        )}
      </div>
    </div>
  );
}
