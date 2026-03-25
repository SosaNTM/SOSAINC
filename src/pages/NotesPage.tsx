import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth, ALL_USERS } from "@/lib/authContext";
import { INITIAL_NOTES, INITIAL_FOLDERS, TAG_PRESETS, type Note, type NoteFolder, INITIAL_TELEGRAM_NOTES, telegramNoteToNote } from "@/lib/notesStore";
import {
  Plus, Search, Pin, Lock, Trash2, Copy, Archive, MoreVertical,
  Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered,
  CheckSquare, Minus, Code, ChevronDown, ChevronRight, X, StickyNote,
  FolderPlus, Folder, FolderOpen, GripVertical, Smartphone, Mic, FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import sw from "./NotesPage.module.css";

// ─── Tag Pill ───
function TagPill({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const preset = TAG_PRESETS[tag] || { color: "#888", label: tag };
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 99,
        background: `${preset.color}20`, color: preset.color, fontWeight: 500,
      }}
    >
      {preset.label}
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", lineHeight: 1 }}>
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ─── Toolbar Button ───
function ToolBtn({ icon: Icon, active, onClick, title }: { icon: any; active?: boolean; onClick: () => void; title?: string }) {
  return (
    <button type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer",
        background: active ? "rgba(232,255,0,0.1)" : "transparent",
        color: active ? "#e8ff00" : "rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(232,255,0,0.04)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "rgba(232,255,0,0.1)" : "transparent"; }}
    >
      <Icon className="w-4 h-4" style={{ strokeWidth: 1.7 }} />
    </button>
  );
}

// ─── Emoji picker for folders ───
const FOLDER_ICONS = ["📁", "💼", "🎨", "🧠", "💰", "📋", "🔬", "🏠", "🎯", "📌", "🔒", "☁️"];

type ViewFilter =
  | { type: "all" }
  | { type: "pinned" }
  | { type: "archive" }
  | { type: "folder"; folderId: string };

// ─── Main Page ───
const NotesPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem("iconoff_notes");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt), updatedAt: new Date(n.updatedAt) }));
      }
    } catch {}
    return [...INITIAL_NOTES, ...INITIAL_TELEGRAM_NOTES.map(telegramNoteToNote)];
  });
  const [folders, setFolders] = useState<NoteFolder[]>(() => {
    try {
      const saved = localStorage.getItem("iconoff_note_folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((f: any) => ({ ...f, createdAt: new Date(f.createdAt), updatedAt: new Date(f.updatedAt) }));
      }
    } catch {}
    return INITIAL_FOLDERS;
  });

  // Persist notes & folders to localStorage on change
  useEffect(() => { localStorage.setItem("iconoff_notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem("iconoff_note_folders", JSON.stringify(folders)); }, [folders]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewingUserId, setViewingUserId] = useState(user?.id || "");
  const [viewFilter, setViewFilter] = useState<ViewFilter>({ type: "all" });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ folder: NoteFolder; x: number; y: number } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [moveToFolderNote, setMoveToFolderNote] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = viewingUserId === user?.id;

  // ─── Derived data ───
  const userNotes = useMemo(() => notes.filter((n) => n.ownerId === viewingUserId), [notes, viewingUserId]);
  const userFolders = useMemo(() => folders.filter((f) => f.ownerId === viewingUserId).sort((a, b) => a.sortOrder - b.sortOrder), [folders, viewingUserId]);

  const searchFiltered = useMemo(() => {
    if (!search) return userNotes;
    const q = search.toLowerCase();
    return userNotes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [userNotes, search]);

  const displayNotes = useMemo(() => {
    if (search) return searchFiltered.filter((n) => !n.isArchived);
    switch (viewFilter.type) {
      case "pinned": return searchFiltered.filter((n) => n.isPinned && !n.isArchived);
      case "archive": return searchFiltered.filter((n) => n.isArchived);
      case "folder": return searchFiltered.filter((n) => n.folderId === viewFilter.folderId && !n.isArchived);
      case "all":
      default: return searchFiltered.filter((n) => n.folderId === null && !n.isArchived);
    }
  }, [searchFiltered, viewFilter, search]);

  const pinnedNotes = useMemo(() => userNotes.filter((n) => n.isPinned && !n.isArchived), [userNotes]);
  const archivedNotes = useMemo(() => userNotes.filter((n) => n.isArchived), [userNotes]);
  const unfiledNotes = useMemo(() => userNotes.filter((n) => n.folderId === null && !n.isArchived && !n.isPinned), [userNotes]);

  const selected = notes.find((n) => n.id === selectedId) || null;

  // ─── Actions ───
  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
  }, []);

  const createNote = () => {
    const folderId = viewFilter.type === "folder" ? viewFilter.folderId : null;
    const id = `note_${Date.now()}`;
    const newNote: Note = {
      id, ownerId: user?.id || "", folderId, title: "", content: "", tags: [],
      isPinned: false, isArchived: false, createdAt: new Date(), updatedAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(id);
    setMobileListOpen(false);
    setTimeout(() => document.getElementById("note-title-input")?.focus(), 50);
  };

  const handleNoteAction = (noteId: string, action: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    switch (action) {
      case "pin": updateNote(noteId, { isPinned: !note.isPinned }); break;
      case "archive": updateNote(noteId, { isArchived: !note.isArchived }); break;
      case "duplicate": {
        const dup: Note = { ...note, id: `note_${Date.now()}`, title: note.title + " (copy)", createdAt: new Date(), updatedAt: new Date() };
        setNotes((prev) => [dup, ...prev]);
        break;
      }
      case "delete": setDeleteConfirm(noteId); break;
      case "move": setMoveToFolderNote(noteId); break;
      case "unfolder": updateNote(noteId, { folderId: null }); break;
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setNotes((prev) => prev.filter((n) => n.id !== deleteConfirm));
      if (selectedId === deleteConfirm) setSelectedId(null);
      setDeleteConfirm(null);
    }
  };

  const confirmDeleteFolder = () => {
    if (!deleteFolderConfirm) return;
    const fid = deleteFolderConfirm;
    // Get all descendant folder ids
    const getDescendants = (parentId: string): string[] => {
      const children = folders.filter((f) => f.parentId === parentId);
      return children.flatMap((c) => [c.id, ...getDescendants(c.id)]);
    };
    const allIds = [fid, ...getDescendants(fid)];
    // Move notes from these folders to unfiled
    setNotes((prev) => prev.map((n) => allIds.includes(n.folderId || "") ? { ...n, folderId: null } : n));
    // Move child folders that aren't being deleted to root
    setFolders((prev) => prev.filter((f) => !allIds.includes(f.id)).map((f) => allIds.includes(f.parentId || "") ? { ...f, parentId: null } : f));
    if (viewFilter.type === "folder" && allIds.includes(viewFilter.folderId)) {
      setViewFilter({ type: "all" });
    }
    setDeleteFolderConfirm(null);
  };

  const addTag = (tag: string) => {
    if (selected && !selected.tags.includes(tag)) updateNote(selected.id, { tags: [...selected.tags, tag] });
    setShowTagPicker(false);
  };

  const removeTag = (tag: string) => {
    if (selected) updateNote(selected.id, { tags: selected.tags.filter((t) => t !== tag) });
  };

  // ─── Folder helpers ───
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const createFolder = (name: string, parentId: string | null, icon: string) => {
    const id = `fld_${Date.now()}`;
    const newFolder: NoteFolder = {
      id, name, parentId, ownerId: user?.id || "", icon, color: "#60a5fa",
      sortOrder: userFolders.length, createdAt: new Date(), updatedAt: new Date(),
    };
    setFolders((prev) => [...prev, newFolder]);
    if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
  };

  const getNotesInFolder = (folderId: string) => userNotes.filter((n) => n.folderId === folderId && !n.isArchived);

  const getFolderBreadcrumb = (folderId: string | null): NoteFolder[] => {
    if (!folderId) return [];
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return [];
    return [...getFolderBreadcrumb(folder.parentId), folder];
  };

  // ─── Drag & Drop ───
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("text/plain", noteId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => setDragOverFolderId(null);

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId) updateNote(noteId, { folderId });
    setDragOverFolderId(null);
  };

  // ─── Close menus on outside click ───
  useEffect(() => {
    const handler = () => {
      setContextMenu(null);
      setFolderContextMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Note list item ───
  const renderNoteItem = (note: Note, indent = 0) => {
    const isActive = selectedId === note.id;
    const isTg = note.source === "telegram";
    const canDrag = canEdit && !isTg;
    return (
      <button type="button"
        key={note.id}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, note.id)}
        onClick={() => { setSelectedId(note.id); setMobileListOpen(false); }}
        onContextMenu={(e) => { e.preventDefault(); if (canEdit || isTg) setContextMenu({ note, x: e.clientX, y: e.clientY }); }}
        className="w-full text-left transition-all duration-150 group"
        style={{
          padding: "8px 10px",
          paddingLeft: indent > 0 ? indent : 10,
          borderRadius: 8,
          marginBottom: 1,
          background: isActive ? "rgba(232,255,0,0.07)" : "transparent",
          borderLeft: isActive ? "3px solid #e8ff00" : "3px solid transparent",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(232,255,0,0.07)" : "transparent"; }}
      >
        <div className="flex items-center gap-1.5">
          {canDrag && <GripVertical className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 cursor-grab" />}
          {note.isPinned && <Pin className="w-3 h-3 shrink-0" style={{ color: "#e8ff00" }} />}
          {isTg && note.file_type === "voice" && <Mic className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.18)" }} />}
          {isTg && note.file_type === "document" && <FileText className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.18)" }} />}
          <span className="truncate" style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? "#fff" : "rgba(255,255,255,0.45)" }}>
            {note.title || "Untitled Note"}
          </span>
          {isTg && (
            <span
              className="ml-auto shrink-0 inline-flex items-center gap-0.5"
              style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 99, background: "rgba(0,136,204,0.12)", color: "#0088cc" }}
            >
              <Smartphone className="w-2.5 h-2.5" /> TG
            </span>
          )}
          {!isTg && canEdit && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setContextMenu({ note, x: e.clientX, y: e.clientY }); }}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(255,255,255,0.18)" }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="truncate" style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 2, paddingLeft: canDrag ? 15 : 0 }}>
          {note.content.replace(/[#*\-\[\]>]/g, "").slice(0, 60)}
        </p>
      </button>
    );
  };

  // ─── Folder tree item ───
  const renderFolderTree = (parentId: string | null, level: number) => {
    const childFolders = userFolders.filter((f) => f.parentId === parentId);
    return childFolders.map((folder) => {
      const isExpanded = expandedFolders.has(folder.id);
      const isActive = viewFilter.type === "folder" && viewFilter.folderId === folder.id;
      const isDragOver = dragOverFolderId === folder.id;
      const notesInFolder = getNotesInFolder(folder.id);
      const hasChildren = userFolders.some((f) => f.parentId === folder.id);
      const hasContent = hasChildren || notesInFolder.length > 0;
      const paddingLeft = 12 + level * 16;

      return (
        <div key={folder.id}>
          <div
            className="flex items-center gap-1.5 transition-all duration-150 group cursor-pointer"
            style={{
              padding: `6px 10px 6px ${paddingLeft}px`,
              borderRadius: 8,
              marginBottom: 1,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
              background: isActive ? "rgba(232,255,0,0.07)" : isDragOver ? "rgba(232,255,0,0.08)" : "transparent",
              border: isDragOver ? "1.5px dashed #e8ff00" : "1.5px solid transparent",
            }}
            onClick={() => { setViewFilter({ type: "folder", folderId: folder.id }); if (hasContent && !isExpanded) toggleFolder(folder.id); }}
            onContextMenu={(e) => { e.preventDefault(); if (canEdit) setFolderContextMenu({ folder, x: e.clientX, y: e.clientY }); }}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            onMouseEnter={(e) => { if (!isActive && !isDragOver) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { if (!isActive && !isDragOver) e.currentTarget.style.background = "transparent"; }}
          >
            {hasContent ? (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.18)", display: "flex" }}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span style={{ width: 14 }} />
            )}

            {renamingFolderId === folder.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => { if (renameValue.trim()) setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, name: renameValue.trim() } : f)); setRenamingFolderId(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenamingFolderId(null); }}
                className=""
                style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, width: "100%" }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span>{folder.icon}</span>
                <span className="truncate flex-1">{folder.name}</span>
                {notesInFolder.length > 0 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>
                    {notesInFolder.length}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Expanded children */}
          {isExpanded && (
            <div style={{ overflow: "hidden", transition: "all 0.15s ease" }}>
              {renderFolderTree(folder.id, level + 1)}
              {notesInFolder.map((note) => renderNoteItem(note, paddingLeft + 16))}
            </div>
          )}
        </div>
      );
    });
  };

  // ─── LEFT PANEL ───
  const leftPanel = (
    <div className={`${sw.sidebar} flex flex-col h-full overflow-hidden`}
    >
      {/* Header */}
      <div className="p-3 flex flex-col gap-2">
        {isOwner && (
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>Viewing:</span>
            <select
              value={viewingUserId}
              onChange={(e) => { setViewingUserId(e.target.value); setSelectedId(null); setViewFilter({ type: "all" }); }}
              className=""
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, flex: 1 }}
            >
              <option value={user?.id || ""}>My Notes</option>
              {ALL_USERS.filter((u) => u.id !== user?.id).map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}'s Notes</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.18)" }} />
          <input
            className="w-full"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30, fontSize: 12, padding: "7px 10px 7px 30px" }}
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Pinned section */}
        {pinnedNotes.length > 0 && !search && (
          <div className="mb-2">
            <button type="button"
              onClick={() => setViewFilter({ type: "pinned" })}
              className="w-full text-left"
              style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                color: viewFilter.type === "pinned" ? "#e8ff00" : "rgba(255,255,255,0.18)",
                padding: "8px 12px 4px", background: "none", border: "none", cursor: "pointer",
              }}
            >
              📌 Pinned ({pinnedNotes.length})
            </button>
            {(viewFilter.type === "pinned" || true) && pinnedNotes.map((n) => renderNoteItem(n))}
          </div>
        )}

        {/* Folders */}
        {!search && (
          <div className="mb-2">
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.18)", padding: "8px 12px 4px" }}>
              📁 Folders
            </p>
            {renderFolderTree(null, 0)}
          </div>
        )}

        {/* All Notes (unfiled) */}
        {!search && (
          <div className="mb-2">
            <button type="button"
              onClick={() => setViewFilter({ type: "all" })}
              className="w-full text-left"
              style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                color: viewFilter.type === "all" ? "#e8ff00" : "rgba(255,255,255,0.18)",
                padding: "8px 12px 4px", background: "none", border: "none", cursor: "pointer",
              }}
            >
              All Notes ({unfiledNotes.length})
            </button>
            {unfiledNotes.map((n) => renderNoteItem(n))}
          </div>
        )}

        {/* Search results */}
        {search && (
          <div className="mb-2">
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.18)", padding: "8px 12px 4px" }}>
              Results ({displayNotes.length})
            </p>
            {displayNotes.map((n) => renderNoteItem(n))}
          </div>
        )}

        {/* Archive */}
        {archivedNotes.length > 0 && !search && (
          <div>
            <button type="button"
              onClick={() => { setShowArchive((p) => !p); setViewFilter({ type: "archive" }); }}
              className="flex items-center gap-1.5 w-full"
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: viewFilter.type === "archive" ? "#e8ff00" : "rgba(255,255,255,0.18)", padding: "8px 12px 4px", background: "none", border: "none", cursor: "pointer" }}
            >
              📁 Archive ({archivedNotes.length})
              <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: showArchive ? "rotate(0)" : "rotate(-90deg)" }} />
            </button>
            {showArchive && archivedNotes.map((n) => renderNoteItem(n))}
          </div>
        )}

        {userNotes.length === 0 && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center", padding: 32 }}>No notes yet</p>
        )}
      </div>
    </div>
  );

  // ─── Breadcrumb for selected note ───
  const selectedBreadcrumb = selected?.folderId ? getFolderBreadcrumb(selected.folderId) : [];

  // ─── Right panel ───
  const rightPanel = selected ? (() => {
    const isTelegramNote = selected.source === "telegram";
    const editAllowed = canEdit;
    return (
    <div className={sw.mainContentWithNote}>
      <div className="lg:hidden p-3">
        <button type="button" onClick={() => setMobileListOpen(true)} style={{ background: "none", border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "1px", padding: "5px 12px", cursor: "pointer" }}>
          ← Back
        </button>
      </div>

      {/* Telegram origin badge */}
      {isTelegramNote && (
        <div className="mx-6 mt-4 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(0,136,204,0.08)", border: "0.5px solid rgba(0,136,204,0.25)" }}>
          <Smartphone className="w-3.5 h-3.5 shrink-0" style={{ color: "#0088cc" }} />
          <span className="text-[12px]" style={{ color: "#0088cc" }}>Nota creata da Telegram</span>
        </div>
      )}

      {/* File/voice info for telegram notes */}
      {isTelegramNote && selected.file_type && (
        <div className="mx-6 mt-2 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #222" }}>
          {selected.file_type === "voice" ? (
            <Mic className="w-3.5 h-3.5 shrink-0" style={{ color: "#e8ff00" }} />
          ) : (
            <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: "#e8ff00" }} />
          )}
          <span className="text-[12px] text-muted-foreground truncate">{selected.file_name}</span>
          {selected.file_url && (
            <a
              href={selected.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] font-semibold shrink-0"
              style={{ color: "#e8ff00", textDecoration: "none" }}
            >
              Scarica ↗
            </a>
          )}
        </div>
      )}

      {/* Title */}
      <div className="px-6 pt-5">
        <input
          id="note-title-input"
          value={selected.title}
          onChange={(e) => updateNote(selected.id, { title: e.target.value })}
          placeholder="Untitled Note"
          readOnly={!editAllowed}
          className={sw.editorTitleInput}
        />
      </div>

      {/* Metadata */}
      <div className="px-6 py-2 flex items-center gap-2 flex-wrap">
        {/* Folder breadcrumb */}
        <div className="flex items-center gap-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", letterSpacing: "1px" }}>
          <Folder className="w-3.5 h-3.5" />
          {selectedBreadcrumb.length > 0 ? (
            selectedBreadcrumb.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.18)" }}>›</span>}
                <button type="button"
                  onClick={() => { setViewFilter({ type: "folder", folderId: f.id }); setExpandedFolders((prev) => new Set(prev).add(f.id)); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: 12 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
                >
                  {f.name}
                </button>
              </span>
            ))
          ) : (
            <span>Unfiled</span>
          )}
          {editAllowed && (
            <button type="button"
              onClick={() => setMoveToFolderNote(selected.id)}
              style={{ fontSize: 9, color: "#e8ff00", background: "none", border: "none", cursor: "pointer", marginLeft: 4, fontFamily: "'Space Mono', monospace", letterSpacing: "1px" }}
            >
              Change
            </button>
          )}
        </div>
      </div>

      {/* Tags + meta */}
      <div className="px-6 py-1 flex items-center gap-2 flex-wrap">
        {selected.tags.map((tag) => (
          <TagPill key={tag} tag={tag} onRemove={editAllowed ? () => removeTag(tag) : undefined} />
        ))}
        {editAllowed && (
          <div className="relative">
            <button type="button"
              onClick={() => setShowTagPicker((p) => !p)}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", background: "none", border: "1px dashed #222", borderRadius: 99, padding: "2px 8px", cursor: "pointer" }}
            >
              + tag
            </button>
            {showTagPicker && (
              <div
                className="absolute top-full left-0 mt-1 z-50"
                style={{
                  background: "#151515", backdropFilter: "blur(20px)",
                  border: "0.5px solid #222", borderRadius: 8, padding: 4, minWidth: 140,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
              >
                {Object.keys(TAG_PRESETS).filter((t) => !selected.tags.includes(t)).map((tag) => (
                  <button type="button"
                    key={tag} onClick={() => addTag(tag)} className="w-full text-left"
                    style={{ fontSize: 12, padding: "5px 10px", borderRadius: 4, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <TagPill tag={tag} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!isTelegramNote && (
          <button type="button"
            onClick={() => editAllowed && updateNote(selected.id, { isPinned: !selected.isPinned })}
            style={{ background: "none", border: "none", cursor: editAllowed ? "pointer" : "default", padding: 2, color: selected.isPinned ? "#e8ff00" : "rgba(255,255,255,0.18)" }}
            title={selected.isPinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>
          <Lock className="w-3 h-3" /> Private
        </span>
      </div>

      {/* Toolbar */}
      {editAllowed && (
        <div className="px-6 pt-2">
          <div className={sw.toolbar}>
            <ToolBtn icon={Bold} onClick={() => insertMarkdown("**", "**")} title="Bold" />
            <ToolBtn icon={Italic} onClick={() => insertMarkdown("*", "*")} title="Italic" />
            <ToolBtn icon={Strikethrough} onClick={() => insertMarkdown("~~", "~~")} title="Strikethrough" />
            <div style={{ width: 1, background: "#222", margin: "4px 2px" }} />
            <ToolBtn icon={Heading1} onClick={() => insertLinePrefix("# ")} title="Heading 1" />
            <ToolBtn icon={Heading2} onClick={() => insertLinePrefix("## ")} title="Heading 2" />
            <div style={{ width: 1, background: "#222", margin: "4px 2px" }} />
            <ToolBtn icon={List} onClick={() => insertLinePrefix("- ")} title="Bullet List" />
            <ToolBtn icon={ListOrdered} onClick={() => insertLinePrefix("1. ")} title="Numbered List" />
            <ToolBtn icon={CheckSquare} onClick={() => insertLinePrefix("- [ ] ")} title="Checkbox" />
            <ToolBtn icon={Minus} onClick={() => insertLinePrefix("---\n")} title="Divider" />
            <ToolBtn icon={Code} onClick={() => insertMarkdown("`", "`")} title="Code" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <textarea
          ref={contentRef}
          value={selected.content}
          onChange={(e) => updateNote(selected.id, { content: e.target.value })}
          readOnly={!editAllowed}
          placeholder="Start writing..."
          className={sw.contentTextarea}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-3" style={{ borderTop: "1px solid #1a1a1a" }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace" }}>
          Edited {formatDistanceToNow(selected.updatedAt, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
  })() : (
    <div className={sw.mainContent}>
      <div className={sw.emptyState}>
        <div className={sw.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="6" y="4" width="20" height="24" rx="2" stroke="#e8ff00" strokeWidth="1.5" opacity="0.4" />
            <path d="M18 4V10H24" stroke="#e8ff00" strokeWidth="1.5" opacity="0.4" />
            <line x1="10" y1="15" x2="22" y2="15" stroke="#e8ff00" strokeWidth="1" opacity="0.2" />
            <line x1="10" y1="19" x2="18" y2="19" stroke="#e8ff00" strokeWidth="1" opacity="0.2" />
          </svg>
        </div>
        <span className={sw.emptyStateText}>Select a note or create a new one</span>
      </div>
    </div>
  );

  // ─── Markdown helpers ───
  function insertMarkdown(before: string, after: string) {
    const el = contentRef.current;
    if (!el || !selected) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = selected.content;
    const sel = text.substring(start, end) || "text";
    const newContent = text.substring(0, start) + before + sel + after + text.substring(end);
    updateNote(selected.id, { content: newContent });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  }

  function insertLinePrefix(prefix: string) {
    const el = contentRef.current;
    if (!el || !selected) return;
    const start = el.selectionStart;
    const text = selected.content;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newContent = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    updateNote(selected.id, { content: newContent });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
  }

  // ─── Count notes in folder for delete confirmation ───
  const folderToDeleteNotesCount = deleteFolderConfirm
    ? (() => {
        const getAll = (pid: string): string[] => {
          const ch = folders.filter((f) => f.parentId === pid);
          return ch.flatMap((c) => [c.id, ...getAll(c.id)]);
        };
        const ids = [deleteFolderConfirm, ...getAll(deleteFolderConfirm)];
        return notes.filter((n) => ids.includes(n.folderId || "")).length;
      })()
    : 0;

  const folderToDeleteName = deleteFolderConfirm ? folders.find((f) => f.id === deleteFolderConfirm)?.name : "";

  return (
    <div className={sw.wrapper} style={{ height: "calc(100vh - 72px)" }}>
      {/* Top bar — SWAG */}
      <div className={sw.topBar}>
        <div className={sw.topLeft}>
          <span className={sw.topIcon}>◆</span>
          <h1 className={sw.topTitle}>Notes</h1>
        </div>
        {canEdit && (
          <div className={sw.topRight}>
            <button type="button" onClick={() => setNewFolderModal(true)} className={sw.folderBtn}>
              <span className={sw.folderBtnIcon}>▤</span>
              New Folder
            </button>
            <button type="button" onClick={createNote} className={sw.newNoteBtn}>
              + New Note
            </button>
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div className={sw.body}>

        <div className={`${mobileListOpen ? "flex" : "hidden"} lg:flex`}>{leftPanel}</div>
        <div className={`${!mobileListOpen ? "flex flex-1" : "hidden"} lg:flex lg:flex-1`}>{rightPanel}</div>
      </div>

      {/* ─── Note Context Menu ─── */}
      {contextMenu && (
        <div
          className="fixed z-[100]"
          style={{
            left: contextMenu.x, top: contextMenu.y,
            background: "#151515", backdropFilter: "blur(20px)",
            border: "1px solid #222", borderRadius: 0, padding: 3, minWidth: 170,
            boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(contextMenu.note.source === "telegram"
            ? [
                { label: "📁 Sposta in…", action: "move" },
                ...(contextMenu.note.folderId ? [{ label: "Rimuovi dalla cartella", action: "unfolder" }] : []),
                { label: "🗑️ Elimina", action: "delete", danger: true },
              ]
            : [
                { label: contextMenu.note.isPinned ? "Unpin" : "📌 Pin", action: "pin" },
                { label: "📁 Move to Folder", action: "move" },
                ...(contextMenu.note.folderId ? [{ label: "Remove from folder", action: "unfolder" }] : []),
                { label: "📋 Duplicate", action: "duplicate" },
                { label: contextMenu.note.isArchived ? "Unarchive" : "📦 Archive", action: "archive" },
                { label: "🗑️ Delete", action: "delete", danger: true },
              ]
          ).map((item) => (
            <button type="button"
              key={item.action}
              onClick={() => { handleNoteAction(contextMenu.note.id, item.action); setContextMenu(null); }}
              className="w-full text-left transition-colors duration-150"
              style={{
                padding: "7px 12px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer",
                background: "transparent",
                color: (item as any).danger ? "#ef4444" : "rgba(255,255,255,0.45)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,255,0,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Folder Context Menu ─── */}
      {folderContextMenu && (
        <div
          className="fixed z-[100]"
          style={{
            left: folderContextMenu.x, top: folderContextMenu.y,
            background: "#151515", backdropFilter: "blur(20px)",
            border: "0.5px solid #222", borderRadius: 10, padding: 4, minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { label: "✏️ Rename", action: "rename" },
            { label: "📁 Add Subfolder", action: "subfolder" },
            { label: "🗑️ Delete", action: "delete", danger: true },
          ].map((item) => (
            <button type="button"
              key={item.action}
              onClick={() => {
                const fld = folderContextMenu.folder;
                if (item.action === "rename") { setRenamingFolderId(fld.id); setRenameValue(fld.name); }
                if (item.action === "subfolder") createFolder("New Folder", fld.id, "📁");
                if (item.action === "delete") setDeleteFolderConfirm(fld.id);
                setFolderContextMenu(null);
              }}
              className="w-full text-left transition-colors duration-150"
              style={{
                padding: "7px 12px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer",
                background: "transparent",
                color: (item as any).danger ? "#ef4444" : "rgba(255,255,255,0.45)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,255,0,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Move to Folder Modal ─── */}
      {moveToFolderNote && (
        <>
          <div className="fixed inset-0 z-[90]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setMoveToFolderNote(null)} />
          <div
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "#151515", backdropFilter: "blur(40px)",
              border: "0.5px solid #222", borderRadius: 16, padding: 24, width: 320,
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Move to Folder</h3>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              <button type="button"
                onClick={() => { updateNote(moveToFolderNote, { folderId: null }); setMoveToFolderNote(null); }}
                className="w-full text-left"
                style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                📄 No folder (unfiled)
              </button>
              {userFolders.map((f) => (
                <button type="button"
                  key={f.id}
                  onClick={() => { updateNote(moveToFolderNote, { folderId: f.id }); setMoveToFolderNote(null); }}
                  className="w-full text-left"
                  style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                    background: "transparent", color: "rgba(255,255,255,0.45)",
                    paddingLeft: f.parentId ? 28 : 12,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {f.icon} {f.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setMoveToFolderNote(null)} className="" style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8 }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ─── New Folder Modal ─── */}
      {newFolderModal && <NewFolderModal folders={userFolders} onClose={() => setNewFolderModal(false)} onCreate={createFolder} />}

      {/* ─── Delete Note Confirm ─── */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[90]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteConfirm(null)} />
          <div
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "#151515", backdropFilter: "blur(40px)",
              border: "0.5px solid #222", borderRadius: 16, padding: 24, width: 340,
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Delete note?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="" style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8 }}>Cancel</button>
              <button type="button" onClick={confirmDelete} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, background: "#ef4444", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </>
      )}

      {/* ─── Delete Folder Confirm ─── */}
      {deleteFolderConfirm && (
        <>
          <div className="fixed inset-0 z-[90]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDeleteFolderConfirm(null)} />
          <div
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "#151515", backdropFilter: "blur(40px)",
              border: "0.5px solid #222", borderRadius: 16, padding: 24, width: 380,
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Delete folder "{folderToDeleteName}"?</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>
              {folderToDeleteNotesCount > 0
                ? `The ${folderToDeleteNotesCount} note${folderToDeleteNotesCount > 1 ? "s" : ""} inside will be moved to All Notes.`
                : "This folder is empty."}
              {" "}Subfolders will be moved to root.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteFolderConfirm(null)} className="" style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8 }}>Cancel</button>
              <button type="button" onClick={confirmDeleteFolder} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, background: "#ef4444", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── New Folder Modal ───
function NewFolderModal({ folders, onClose, onCreate }: { folders: NoteFolder[]; onClose: () => void; onCreate: (name: string, parentId: string | null, icon: string) => void }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState("📁");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), parentId, icon);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[90]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "#151515", backdropFilter: "blur(40px)",
          border: "0.5px solid #222", borderRadius: 16, padding: 24, width: 360,
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>New Folder</h3>

        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 4, display: "block" }}>Folder Name *</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="w-full mb-4"
          placeholder="e.g. Work, Personal..."
          style={{ fontSize: 13, padding: "9px 12px" }}
        />

        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 4, display: "block" }}>Parent Folder</label>
        <select
          value={parentId || ""}
          onChange={(e) => setParentId(e.target.value || null)}
          className="w-full mb-4"
          style={{ fontSize: 13, padding: "9px 12px" }}
        >
          <option value="">None (root)</option>
          {folders.filter((f) => !f.parentId || folders.some((p) => p.id === f.parentId && !p.parentId)).map((f) => (
            <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
          ))}
        </select>

        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 6, display: "block" }}>Icon</label>
        <div className="flex gap-2 flex-wrap mb-6">
          {FOLDER_ICONS.map((emoji) => (
            <button type="button"
              key={emoji}
              onClick={() => setIcon(emoji)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: icon === emoji ? "2px solid #e8ff00" : "1px solid #222",
                background: icon === emoji ? "rgba(232,255,0,0.08)" : "transparent",
                fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="" style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8 }}>Cancel</button>
          <button type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className=""
            style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, opacity: name.trim() ? 1 : 0.5 }}
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}

export default NotesPage;
