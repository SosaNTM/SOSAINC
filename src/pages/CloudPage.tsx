import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SearchBar, type SearchResult } from "@/components/ui/SearchBar";
import { useAuth, getUserById, ALL_USERS } from "@/lib/authContext";
import {
  INITIAL_FOLDERS, INITIAL_FILES, INITIAL_SECTIONS, TOTAL_STORAGE_GB, USED_STORAGE_GB,
  MOCK_FOLDER_PASSWORDS,
  getFileTypeIcon, formatFileSize, getUserPermission, getFolderPath,
  daysUntilPermanentDelete, getCountdownSeverity,
  type CloudFolder, type CloudFile, type PermissionLevel, type FolderSection } from
"@/lib/cloudStore";
import {
  Cloud, Plus, Upload, Search, LayoutGrid, List, ChevronRight, ChevronDown,
  FolderIcon, FolderOpen, Trash2, X, MoreVertical, Download, Pencil, Move, Link2, Eye, Shield,
  RotateCcw, FolderPlus, AlertTriangle, Clock, Layers, Lock, Unlock, EyeOff, Home } from
"lucide-react";
import { Tree, Folder as TreeFolder, File as TreeFile } from "@/components/ui/tree-view";
import FilePreviewDrawer from "@/components/cloud/FilePreviewDrawer";
import TrashPreviewDrawer from "@/components/cloud/TrashPreviewDrawer";
import StorageOverview from "@/components/cloud/StorageOverview";
// SearchBar imported at line 2
import { ActionMenu, type ActionMenuEntry } from "@/components/ActionMenu";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { addAuditEntry } from "@/lib/adminStore";

/* ── Password Strength ── */
function getPasswordStrength(pw: string): {level: "weak" | "fair" | "good" | "strong";percent: number;label: string;} {
  if (pw.length < 6) return { level: "weak", percent: 25, label: "Weak" };
  const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNum = /\d/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  if (pw.length >= 12 && hasMixed && hasNum && hasSym) return { level: "strong", percent: 100, label: "Strong" };
  if (pw.length >= 8 && (hasMixed || hasNum)) return { level: "good", percent: 75, label: "Good" };
  return { level: "fair", percent: 50, label: "Fair" };
}

const strengthColors = { weak: "bg-destructive", fair: "bg-orange-500", good: "bg-yellow-500", strong: "bg-green-500" };

/* ── Unlock State Helpers ── */
function getUnlockState(folderId: string): {unlocked: boolean;expiresAt: number | null;} {
  // Check session storage first
  const session = sessionStorage.getItem(`cloud_unlock_${folderId}`);
  if (session) return { unlocked: true, expiresAt: null };
  // Check timed localStorage
  const timed = localStorage.getItem(`cloud_unlock_timed_${folderId}`);
  if (timed) {
    try {
      const { expiresAt } = JSON.parse(timed);
      if (expiresAt && Date.now() < expiresAt) return { unlocked: true, expiresAt };
      localStorage.removeItem(`cloud_unlock_timed_${folderId}`);
    } catch {/* ignore */}
  }
  return { unlocked: false, expiresAt: null };
}

function setUnlockState(folderId: string, remember: "none" | "session" | "timed", timeoutMinutes?: number) {
  if (remember === "session") {
    sessionStorage.setItem(`cloud_unlock_${folderId}`, "1");
  } else if (remember === "timed") {
    const expiresAt = Date.now() + (timeoutMinutes || 30) * 60 * 1000;
    localStorage.setItem(`cloud_unlock_timed_${folderId}`, JSON.stringify({ expiresAt }));
  }
  // "none" = no persistence
}

function clearUnlockState(folderId: string) {
  sessionStorage.removeItem(`cloud_unlock_${folderId}`);
  localStorage.removeItem(`cloud_unlock_timed_${folderId}`);
}

/* ── Breadcrumb ── */
function Breadcrumb({ folderId, folders, onNavigate }: {folderId: string | null;folders: CloudFolder[];onNavigate: (id: string | null) => void;}) {
  const path: {id: string | null;name: string;isLocked?: boolean;}[] = [{ id: null, name: "Cloud" }];
  let cur = folderId;
  const segments: {id: string;name: string;isLocked?: boolean;}[] = [];
  while (cur) {
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    segments.unshift({ id: f.id, name: f.name, isLocked: f.isLocked });
    cur = f.parentId;
  }
  path.push(...segments);

  return (
    <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
      {path.map((seg, i) =>
      <span key={seg.id || "root"} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          <button type="button"
          onClick={() => onNavigate(seg.id)}
          className={`bg-transparent border-none cursor-pointer px-1 py-0.5 rounded text-xs hover:bg-accent/50 flex items-center gap-1 ${i === path.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>

            {seg.name}
            {seg.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
          </button>
        </span>
      )}
    </div>);

}

/* ── Section Header ── */
function SectionHeader({
  section, fileCount, isCollapsed, canWrite, onToggle, onRename, onAddBelow, onMoveUp, onMoveDown, onDelete,
  dragOver, onDragOver, onDragLeave, onDrop






}: {section: FolderSection | null;fileCount: number;isCollapsed: boolean;canWrite: boolean;onToggle: () => void;onRename?: () => void;onAddBelow?: () => void;onMoveUp?: () => void;onMoveDown?: () => void;onDelete?: () => void;dragOver?: boolean;onDragOver?: (e: React.DragEvent) => void;onDragLeave?: (e: React.DragEvent) => void;onDrop?: (e: React.DragEvent) => void;}) {
  const isOther = !section;
  const menuItems: ActionMenuEntry[] = section ? [
  { id: "rename", icon: <Pencil className="w-3.5 h-3.5" />, label: "Rename", onClick: onRename || (() => {}) },
  { id: "add-below", icon: <Plus className="w-3.5 h-3.5" />, label: "Add Section Below", onClick: onAddBelow || (() => {}) },
  { id: "move-up", icon: <ChevronRight className="w-3.5 h-3.5 -rotate-90" />, label: "Move Up", onClick: onMoveUp || (() => {}) },
  { id: "move-down", icon: <ChevronRight className="w-3.5 h-3.5 rotate-90" />, label: "Move Down", onClick: onMoveDown || (() => {}) },
  { type: "divider" },
  { id: "delete", icon: <Trash2 className="w-3.5 h-3.5" />, label: "Delete Section", onClick: onDelete || (() => {}), destructive: true }] :
  [];

  return (
    <div
      className={`flex items-center gap-2 select-none cursor-pointer group transition-colors rounded-lg ${dragOver ? "ring-2 ring-dashed ring-primary bg-primary/5" : ""}`}
      style={{ padding: "10px 16px 6px" }}
      onClick={onToggle}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}>

      {!isOther &&
      <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`} />
      }
      <Layers className="w-3 h-3 text-muted-foreground/50" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {section?.name || "Other Files"}
      </span>
      <span className="text-[10px] text-muted-foreground/50">({fileCount})</span>
      <div className="flex-1" />
      {section && canWrite &&
      <span onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionMenu trigger={<MoreVertical className="w-3.5 h-3.5" />} items={menuItems} />
        </span>
      }
    </div>);

}

/* ── Empty State Search ── */
function EmptyStateSearch({
  files, folders, getPerm, onNavigateFolder, onSelectFile





}: {files: CloudFile[];folders: CloudFolder[];getPerm: (folderId: string) => PermissionLevel | null;onNavigateFolder: (id: string | null) => void;onSelectFile: (file: CloudFile) => void;}) {
  const [query, setQuery] = useState("");

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    // Search folders
    folders.filter((f) => !f.isDeleted && f.name.toLowerCase().includes(q)).forEach((f) => {
      out.push({ id: f.id, name: f.name, type: "folder", path: getFolderPath(f.id, folders) });
    });

    // Search files
    files.filter((f) => !f.isDeleted && f.name.toLowerCase().includes(q) && getPerm(f.folderId)).forEach((f) => {
      out.push({ id: f.id, name: f.name, type: "file", fileType: f.type, path: getFolderPath(f.folderId, folders) });
    });

    return out.slice(0, 6);
  }, [query, files, folders, getPerm]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === "folder") {
      onNavigateFolder(result.id);
    } else {
      const file = files.find((f) => f.id === result.id);
      if (file) onSelectFile(file);
    }
  }, [files, onNavigateFolder, onSelectFile]);

  return (
    <div className="flex flex-col items-center justify-center h-full overflow-hidden gap-4">
      <h2 className="text-lg font-semibold text-foreground text-lg">Cosa stai cercando?</h2>
      <SearchBar
        placeholder="Search all files..."
        results={results}
        onQueryChange={setQuery}
        onSelectResult={handleSelect} />

    </div>);

}

/* ── Main Component ── */
const CloudPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [folders, setFolders] = useState<CloudFolder[]>(() => {
    try {
      const saved = localStorage.getItem("iconoff_cloud_folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          return parsed.map((f: any) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            passwordSetAt: f.passwordSetAt ? new Date(f.passwordSetAt) : null,
            lockedUntil: f.lockedUntil ? new Date(f.lockedUntil) : null,
          }));
        }
      }
    } catch { localStorage.removeItem("iconoff_cloud_folders"); }
    return INITIAL_FOLDERS;
  });
  const [files, setFiles] = useState<CloudFile[]>(() => {
    try {
      const saved = localStorage.getItem("iconoff_cloud_files");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          return parsed.map((f: any) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            modifiedAt: new Date(f.modifiedAt),
            deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
            permanentDeleteAt: f.permanentDeleteAt ? new Date(f.permanentDeleteAt) : null,
          }));
        }
      }
    } catch { localStorage.removeItem("iconoff_cloud_files"); }
    return INITIAL_FILES;
  });
  const [sections, setSections] = useState<FolderSection[]>(() => {
    try {
      const saved = localStorage.getItem("iconoff_cloud_sections");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { localStorage.removeItem("iconoff_cloud_sections"); }
    return INITIAL_SECTIONS;
  });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [permissionsModal, setPermissionsModal] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f_root_projects"]));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [trashPreviewFile, setTrashPreviewFile] = useState<CloudFile | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<CloudFile | null>(null);
  const [confirmPermDelete, setConfirmPermDelete] = useState<CloudFile | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<CloudFolder | null>(null);
  const [recoverFile, setRecoverFile] = useState<CloudFile | null>(null);
  const [recoverTarget, setRecoverTarget] = useState<string>("parent");
  const [moveFileModal, setMoveFileModal] = useState<CloudFile | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showStorage, setShowStorage] = useState(false);

  // Persist cloud data to localStorage
  useEffect(() => { localStorage.setItem("iconoff_cloud_folders", JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem("iconoff_cloud_files", JSON.stringify(files)); }, [files]);
  useEffect(() => { localStorage.setItem("iconoff_cloud_sections", JSON.stringify(sections)); }, [sections]);

  // Section states
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("cloud_collapsed_sections");
    if (saved) try {return new Set(JSON.parse(saved));} catch {/* ignore */}
    return new Set(INITIAL_SECTIONS.filter((s) => s.isCollapsed).map((s) => s.id));
  });
  const [newSectionName, setNewSectionName] = useState<string | null>(null);
  const [newSectionAfter, setNewSectionAfter] = useState<string | null>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [sectionRenameValue, setSectionRenameValue] = useState("");
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState<FolderSection | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Password states
  const [unlockPromptFolder, setUnlockPromptFolder] = useState<CloudFolder | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockShowPassword, setUnlockShowPassword] = useState(false);
  const [unlockRemember, setUnlockRemember] = useState<"none" | "session" | "timed">("none");
  const [unlockError, setUnlockError] = useState("");
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(() => {
    // Check existing unlock states on mount
    const unlocked = new Set<string>();
    INITIAL_FOLDERS.forEach((f) => {
      if (f.isLocked && getUnlockState(f.id).unlocked) unlocked.add(f.id);
    });
    return unlocked;
  });

  // Password management modals
  const [setPasswordFolder, setSetPasswordFolder] = useState<CloudFolder | null>(null);
  const [changePasswordFolder, setChangePasswordFolder] = useState<CloudFolder | null>(null);
  const [removePasswordFolder, setRemovePasswordFolder] = useState<CloudFolder | null>(null);

  const userRole = user?.role || "member";
  const userId = user?.id || "";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const isOwner = userRole === "owner";

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setUnlockAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Auto-lock check: periodically check if timed unlocks have expired
  useEffect(() => {
    const interval = setInterval(() => {
      setUnlockedFolders((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => {
          if (getUnlockState(id).unlocked) next.add(id);
        });
        if (next.size !== prev.size) return next;
        return prev;
      });
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  const getPerm = useCallback((folderId: string): PermissionLevel | null => {
    return getUserPermission(folderId, userId, userRole, folders);
  }, [userId, userRole, folders]);

  const isFolderUnlocked = useCallback((folder: CloudFolder): boolean => {
    if (!folder.isLocked) return true;
    if (isOwner) return true; // Owner always bypasses
    return unlockedFolders.has(folder.id);
  }, [unlockedFolders, isOwner]);

  const rootFolders = useMemo(() => folders.filter((f) => f.parentId === null && !f.isDeleted), [folders]);
  const getChildren = useCallback((parentId: string) => folders.filter((f) => f.parentId === parentId && !f.isDeleted), [folders]);
  const trashCount = useMemo(() => files.filter((f) => f.isDeleted).length, [files]);
  const trashSize = useMemo(() => files.filter((f) => f.isDeleted).reduce((s, f) => s + f.size, 0), [files]);

  const currentFiles = useMemo(() => {
    if (showTrash) return files.filter((f) => f.isDeleted);
    if (searchQuery.trim()) {
      return files.filter((f) => !f.isDeleted && f.name.toLowerCase().includes(searchQuery.toLowerCase()) && getPerm(f.folderId));
    }
    if (!currentFolderId) return [];
    return files.filter((f) => f.folderId === currentFolderId && !f.isDeleted);
  }, [currentFolderId, files, showTrash, searchQuery, getPerm]);

  const sortedFiles = useMemo(() => {
    const s = [...currentFiles];
    if (sortBy === "name") s.sort((a, b) => a.name.localeCompare(b.name));else
    if (sortBy === "size") s.sort((a, b) => b.size - a.size);else
    s.sort((a, b) => (b.isDeleted && b.deletedAt ? b.deletedAt.getTime() : b.modifiedAt.getTime()) - (a.isDeleted && a.deletedAt ? a.deletedAt.getTime() : a.modifiedAt.getTime()));
    return s;
  }, [currentFiles, sortBy]);

  const currentSubfolders = useMemo(() => {
    if (showTrash || searchQuery.trim()) return [];
    return folders.filter((f) => f.parentId === currentFolderId && !f.isDeleted);
  }, [currentFolderId, folders, showTrash, searchQuery]);

  const currentSections = useMemo(() => {
    if (!currentFolderId || showTrash || searchQuery.trim()) return [];
    return sections.filter((s) => s.folderId === currentFolderId).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [currentFolderId, sections, showTrash, searchQuery]);

  const currentPerm = currentFolderId ? getPerm(currentFolderId) : isOwnerOrAdmin ? "admin" : "read";
  const canWrite = currentPerm === "write" || currentPerm === "admin";
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;
  const currentFolderUnlocked = currentFolder ? isFolderUnlocked(currentFolder) : true;
  const currentFolderUnlockState = currentFolderId ? getUnlockState(currentFolderId) : null;

  // Section collapse persistence
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      localStorage.setItem("cloud_collapsed_sections", JSON.stringify([...next]));
      return next;
    });
  };

  // ── Navigate with lock check ──
  const attemptNavigateFolder = (id: string | null) => {
    if (!id) {navigateFolder(id);return;}
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    if (folder.isLocked && !isFolderUnlocked(folder)) {
      if (isOwner) {
        // Owner bypass
        setUnlockedFolders((prev) => new Set(prev).add(id));
        setUnlockState(id, "session");
        toast.success("🔓 Owner access — no password required");
        navigateFolder(id);
      } else {
        setUnlockPromptFolder(folder);
        setUnlockPassword("");
        setUnlockError("");
        setUnlockShowPassword(false);
        setUnlockRemember("none");
        // Check if folder is in lockout
        if (folder.lockedUntil && folder.lockedUntil.getTime() > Date.now()) {
          setLockoutUntil(folder.lockedUntil.getTime());
          setLockoutRemaining(Math.ceil((folder.lockedUntil.getTime() - Date.now()) / 1000));
        }
      }
    } else {
      navigateFolder(id);
    }
  };

  const navigateFolder = (id: string | null) => {
    setCurrentFolderId(id);
    setShowTrash(false);
    setShowStorage(false);
    setSearchQuery("");
    if (id) {
      let cur: string | null = id;
      const toExpand = new Set(expandedFolders);
      while (cur) {
        const f = folders.find((x) => x.id === cur);
        if (!f) break;
        toExpand.add(cur);
        cur = f.parentId;
      }
      setExpandedFolders(toExpand);
    }
  };

  // ── Unlock handler ──
  const handleUnlock = () => {
    if (!unlockPromptFolder || lockoutUntil) return;
    const folder = unlockPromptFolder;
    const correctPassword = MOCK_FOLDER_PASSWORDS[folder.id] || folder.passwordHash;

    if (unlockPassword === correctPassword) {
      setUnlockedFolders((prev) => new Set(prev).add(folder.id));
      setUnlockState(folder.id, unlockRemember, folder.lockAutoTimeoutMinutes || 30);
      setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, failedAttempts: 0 } : f));
      setUnlockPromptFolder(null);
      setUnlockAttempts(0);
      navigateFolder(folder.id);
      toast.success(`🔓 ${folder.name} unlocked`);
      addAuditEntry({ userId, action: `Unlocked folder "${folder.name}"`, category: "cloud", details: `Locked folder accessed with password`, icon: "🔓" });
    } else {
      const newAttempts = unlockAttempts + 1;
      setUnlockAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 5 * 60 * 1000;
        setLockoutUntil(lockoutTime);
        setLockoutRemaining(300);
        setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, failedAttempts: newAttempts, lockedUntil: new Date(lockoutTime) } : f));
        setUnlockError("Too many failed attempts");
        addAuditEntry({ userId, action: `Folder "${folder.name}" locked — too many failed attempts`, category: "cloud", details: `5 failed unlock attempts, folder locked for 5 minutes`, icon: "⚠️" });
      } else if (newAttempts >= 3) {
        setUnlockError(`Incorrect password (${5 - newAttempts} attempts remaining)`);
        addAuditEntry({ userId, action: `Failed unlock attempt on "${folder.name}"`, category: "cloud", details: `Incorrect password — attempt ${newAttempts}/5`, icon: "⚠️" });
      } else {
        setUnlockError("Incorrect password");
        addAuditEntry({ userId, action: `Failed unlock attempt on "${folder.name}"`, category: "cloud", details: `Incorrect password — attempt ${newAttempts}/5`, icon: "⚠️" });
      }
      setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, failedAttempts: newAttempts } : f));
    }
  };

  // ── Lock folder now ──
  const lockFolderNow = (folderId: string) => {
    clearUnlockState(folderId);
    setUnlockedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
    if (currentFolderId === folderId) setCurrentFolderId(null);
    const folderName = folders.find(f => f.id === folderId)?.name || folderId;
    toast.success("🔒 Folder locked");
    addAuditEntry({ userId, action: `Locked folder "${folderName}"`, category: "cloud", details: "Folder manually locked during session", icon: "🔒" });
  };

  // ── Set/Change/Remove Password ──
  const handleSetPassword = (folderId: string, password: string, timeoutMinutes: number) => {
    MOCK_FOLDER_PASSWORDS[folderId] = password;
    const folderName = folders.find(f => f.id === folderId)?.name || folderId;
    setFolders((prev) => prev.map((f) => f.id === folderId ? {
      ...f, isLocked: true, passwordHash: password, passwordSetBy: userId,
      passwordSetAt: new Date(), lockAutoTimeoutMinutes: timeoutMinutes,
      failedAttempts: 0, lockedUntil: null
    } : f));
    setSetPasswordFolder(null);
    toast.success("🔒 Password set");
    addAuditEntry({ userId, action: `Set password on folder "${folderName}"`, category: "cloud", details: `Auto-lock timeout: ${timeoutMinutes} min`, icon: "🔐" });
  };

  const handleChangePassword = (folderId: string, newPassword: string) => {
    MOCK_FOLDER_PASSWORDS[folderId] = newPassword;
    const folderName = folders.find(f => f.id === folderId)?.name || folderId;
    setFolders((prev) => prev.map((f) => f.id === folderId ? {
      ...f, passwordHash: newPassword, passwordSetBy: userId, passwordSetAt: new Date(),
      failedAttempts: 0, lockedUntil: null
    } : f));
    clearUnlockState(folderId);
    setUnlockedFolders((prev) => {const next = new Set(prev);next.delete(folderId);return next;});
    setChangePasswordFolder(null);
    toast.success("🔒 Password changed — all sessions revoked");
    addAuditEntry({ userId, action: `Changed password on folder "${folderName}"`, category: "cloud", details: "All active sessions revoked", icon: "🔐" });
  };

  const handleRemovePassword = (folderId: string) => {
    delete MOCK_FOLDER_PASSWORDS[folderId];
    const folderName = folders.find(f => f.id === folderId)?.name || folderId;
    setFolders((prev) => prev.map((f) => f.id === folderId ? {
      ...f, isLocked: false, passwordHash: null, passwordSetBy: null, passwordSetAt: null,
      failedAttempts: 0, lockedUntil: null
    } : f));
    clearUnlockState(folderId);
    setUnlockedFolders((prev) => {const next = new Set(prev);next.delete(folderId);return next;});
    setRemovePasswordFolder(null);
    toast.success("🔓 Password removed");
    addAuditEntry({ userId, action: `Removed password from folder "${folderName}"`, category: "cloud", details: "Folder is now unprotected", icon: "🔓" });
  };

  // ── Actions (unchanged) ──
  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createFolder = () => {
    if (!newFolderName?.trim()) return;
    const id = `f_${Date.now()}`;
    const parentPerms = currentFolderId ? folders.find((f) => f.id === currentFolderId)?.permissions || [] : [];
    const parentName = currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : "Cloud Root";
    setFolders((prev) => [...prev, { id, name: newFolderName.trim(), parentId: currentFolderId, permissions: parentPerms, inheritPermissions: !!currentFolderId, createdAt: new Date() }]);
    setNewFolderName(null);
    toast.success(`Folder "${newFolderName.trim()}" created`);
    addAuditEntry({ userId, action: `Created folder "${newFolderName.trim()}"`, category: "cloud", details: `Created inside ${parentName}`, icon: "📁" });
  };

  const moveToTrash = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    const folderName = file ? getFolderPath(file.folderId, folders) : "";
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f;
      const delDate = new Date();
      const permDelDate = new Date(delDate);
      permDelDate.setDate(permDelDate.getDate() + 60);
      return {
        ...f,
        isDeleted: true,
        deletedAt: delDate,
        deletedBy: userId,
        originalFolderId: f.folderId,
        originalFolderPath: getFolderPath(f.folderId, folders),
        permanentDeleteAt: permDelDate,
        folderId: "trash",
        sectionId: null
      };
    }));
    toast.success("Moved to Trash");
    if (file) addAuditEntry({ userId, action: `Moved "${file.name}" to Trash`, category: "cloud", details: `From ${folderName}`, icon: "🗑️" });
  };

  const handleRecover = (file: CloudFile) => {
    const origFolder = file.originalFolderId ? folders.find((f) => f.id === file.originalFolderId && !f.isDeleted) : null;
    if (origFolder) {
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, isDeleted: false, deletedAt: null, deletedBy: null, permanentDeleteAt: null, folderId: origFolder.id } : f));
      toast.success(`"${file.name}" restored to ${origFolder.name}`);
      addAuditEntry({ userId, action: `Restored "${file.name}" from Trash`, category: "cloud", details: `Restored to ${origFolder.name}`, icon: "♻️" });
    } else {
      setRecoverFile(file);
      setRecoverTarget("root");
    }
  };

  const executeRecover = () => {
    if (!recoverFile) return;
    let targetId: string;
    if (recoverTarget === "root") targetId = "f_root_projects";else
    if (recoverTarget === "choose" && moveTarget) targetId = moveTarget;else
    {
      const origParent = recoverFile.originalFolderId ? folders.find((f) => f.id === recoverFile.originalFolderId)?.parentId : null;
      targetId = origParent && folders.find((f) => f.id === origParent && !f.isDeleted) ? origParent : "f_root_projects";
    }
    const targetName = folders.find((f) => f.id === targetId)?.name || "Cloud";
    setFiles((prev) => prev.map((f) => f.id === recoverFile.id ? { ...f, isDeleted: false, deletedAt: null, deletedBy: null, permanentDeleteAt: null, folderId: targetId } : f));
    toast.success(`"${recoverFile.name}" restored to ${targetName}`);
    addAuditEntry({ userId, action: `Restored "${recoverFile.name}" from Trash`, category: "cloud", details: `Restored to ${targetName}`, icon: "♻️" });
    setRecoverFile(null);
    setMoveTarget(null);
  };

  const permanentDelete = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setConfirmPermDelete(null);
    toast.success("Permanently deleted");
    if (file) addAuditEntry({ userId, action: `Permanently deleted "${file.name}"`, category: "cloud", details: "File removed from Trash — cannot be recovered", icon: "❌" });
  };

  const emptyTrash = () => {
    const count = files.filter(f => f.isDeleted).length;
    setFiles((prev) => prev.filter((f) => !f.isDeleted));
    setConfirmEmptyTrash(false);
    toast.success("Trash emptied");
    addAuditEntry({ userId, action: "Emptied Trash", category: "cloud", details: `${count} file(s) permanently deleted`, icon: "🗑️" });
  };

  const deleteFolderAndContents = (folder: CloudFolder) => {
    const allFolderIds = new Set<string>();
    const collectIds = (parentId: string) => {
      allFolderIds.add(parentId);
      folders.filter((f) => f.parentId === parentId).forEach((f) => collectIds(f.id));
    };
    collectIds(folder.id);

    const affectedFiles = files.filter(f => allFolderIds.has(f.folderId) && !f.isDeleted);
    setFiles((prev) => prev.map((f) => {
      if (!allFolderIds.has(f.folderId) || f.isDeleted) return f;
      const delDate = new Date();
      const permDelDate = new Date(delDate);
      permDelDate.setDate(permDelDate.getDate() + 60);
      return {
        ...f, isDeleted: true, deletedAt: delDate, deletedBy: userId,
        originalFolderId: f.folderId, originalFolderPath: getFolderPath(f.folderId, folders),
        permanentDeleteAt: permDelDate, folderId: "trash", sectionId: null
      };
    }));

    setSections((prev) => prev.filter((s) => !allFolderIds.has(s.folderId)));
    setFolders((prev) => prev.map((f) => allFolderIds.has(f.id) ? { ...f, isDeleted: true } : f));

    if (currentFolderId && allFolderIds.has(currentFolderId)) {
      setCurrentFolderId(null);
    }
    setConfirmDeleteFolder(null);
    toast.success(`Folder "${folder.name}" moved to trash`);
    addAuditEntry({ userId, action: `Deleted folder "${folder.name}"`, category: "cloud", details: `${affectedFiles.length} file(s) moved to Trash`, icon: "🗑️" });
  };

  const moveFileToFolder = (fileId: string, targetFolderId: string) => {
    const file = files.find(f => f.id === fileId);
    const targetFolderName = folders.find((f) => f.id === targetFolderId)?.name || "folder";
    const sourceFolderName = file ? (folders.find(f => f.id === file.folderId)?.name || "Cloud") : "Cloud";
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, folderId: targetFolderId, modifiedAt: new Date(), sectionId: null } : f));
    toast.success(`Moved to ${targetFolderName}`);
    setMoveFileModal(null);
    setMoveTarget(null);
    if (file) addAuditEntry({ userId, action: `Moved "${file.name}" to "${targetFolderName}"`, category: "cloud", details: `From ${sourceFolderName}`, icon: "📦" });
  };

  const renameFile = (fileId: string, newName?: string) => {
    const val = newName || renameValue;
    if (!val.trim()) {setRenamingFileId(null);return;}
    const file = files.find(f => f.id === fileId);
    const oldName = file?.name;
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, name: val.trim(), modifiedAt: new Date() } : f));
    setRenamingFileId(null);
    if (file && oldName !== val.trim()) addAuditEntry({ userId, action: `Renamed "${oldName}" to "${val.trim()}"`, category: "cloud", details: "File renamed", icon: "✏️" });
  };

  const updateFileDescription = (fileId: string, desc: string) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, description: desc || null, modifiedAt: new Date() } : f));
  };

  const mockUpload = (names: string[]) => {
    if (!currentFolderId) return;
    const newFiles: CloudFile[] = names.map((name, i) => {
      const ext = name.split(".").pop()?.toLowerCase() || "";
      let type: CloudFile["type"] = "other";
      if (ext === "pdf") type = "pdf";else
      if (["doc", "docx"].includes(ext)) type = "docx";else
      if (["xls", "xlsx"].includes(ext)) type = "xlsx";else
      if (["jpg", "png", "gif", "webp", "svg"].includes(ext)) type = "image";else
      if (ext === "zip") type = "zip";else
      if (ext === "pptx") type = "pptx";
      return { id: `cf_${Date.now()}_${i}`, name, folderId: currentFolderId, size: Math.floor(Math.random() * 5000000) + 100000, type, ownerId: userId, modifiedAt: new Date(), createdAt: new Date(), isDeleted: false, deletedAt: null, deletedBy: null, originalFolderId: null, originalFolderPath: null, permanentDeleteAt: null };
    });
    setFiles((prev) => [...newFiles, ...prev]);
    setShowUploadModal(false);
    toast.success(`${names.length} file(s) uploaded`);
    const folderName = folders.find(f => f.id === currentFolderId)?.name || "Cloud";
    addAuditEntry({ userId, action: `Uploaded ${names.length} file(s) to "${folderName}"`, category: "cloud", details: names.join(", "), icon: "📄" });
  };

  // ── Section CRUD (unchanged) ──
  const createSection = (name: string, afterSectionId?: string | null) => {
    if (!name.trim() || !currentFolderId) return;
    const folderSections = sections.filter((s) => s.folderId === currentFolderId).sort((a, b) => a.sortOrder - b.sortOrder);
    let sortOrder: number;
    if (afterSectionId) {
      const idx = folderSections.findIndex((s) => s.id === afterSectionId);
      sortOrder = idx >= 0 ? folderSections[idx].sortOrder + 0.5 : folderSections.length;
    } else {
      sortOrder = folderSections.length > 0 ? Math.max(...folderSections.map((s) => s.sortOrder)) + 1 : 0;
    }
    const newSection: FolderSection = {
      id: `sec_${Date.now()}`, folderId: currentFolderId, name: name.trim(),
      sortOrder, isCollapsed: false, createdBy: userId, createdAt: new Date()
    };
    setSections((prev) => {
      // Normalize sort orders
      const updated = [...prev, newSection].map((s) => {
        if (s.folderId !== currentFolderId) return s;
        return s;
      });
      const folderOnes = updated.filter((s) => s.folderId === currentFolderId).sort((a, b) => a.sortOrder - b.sortOrder);
      return updated.map((s) => {
        if (s.folderId !== currentFolderId) return s;
        const idx = folderOnes.findIndex((x) => x.id === s.id);
        return { ...s, sortOrder: idx };
      });
    });
    setNewSectionName(null);
    setNewSectionAfter(null);
    toast.success(`Section "${name.trim()}" created`);
  };

  const renameSection = (sectionId: string, newName: string) => {
    if (!newName.trim()) {setRenamingSectionId(null);return;}
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, name: newName.trim() } : s));
    setRenamingSectionId(null);
  };

  const deleteSection = (section: FolderSection) => {
    // Move files to unsectioned
    setFiles((prev) => prev.map((f) => f.sectionId === section.id ? { ...f, sectionId: null } : f));
    setSections((prev) => prev.filter((s) => s.id !== section.id));
    setDeleteSectionConfirm(null);
    toast.success(`Section "${section.name}" deleted`);
  };

  const moveSectionOrder = (sectionId: string, direction: "up" | "down") => {
    const folderSections = sections.filter((s) => s.folderId === currentFolderId).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = folderSections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= folderSections.length) return;
    const a = folderSections[idx];
    const b = folderSections[swapIdx];
    setSections((prev) => prev.map((s) => {
      if (s.id === a.id) return { ...s, sortOrder: b.sortOrder };
      if (s.id === b.id) return { ...s, sortOrder: a.sortOrder };
      return s;
    }));
  };

  const moveFileToSection = (fileId: string, sectionId: string | null) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, sectionId } : f));
    const sectionName = sectionId ? sections.find((s) => s.id === sectionId)?.name : "Other Files";
    toast.success(`Moved to ${sectionName}`);
  };

  // ── Render Folder Tree ──
  const renderFolderItem = (folder: CloudFolder, depth: number) => {
    const children = getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = currentFolderId === folder.id && !showTrash;
    const fileCount = files.filter((f) => f.folderId === folder.id && !f.isDeleted).length;
    const isLocked = folder.isLocked;
    const isUnlocked = isFolderUnlocked(folder);

    return (
      <div key={folder.id}>
        <div className="flex items-center group">
          <button type="button"
            onClick={() => {attemptNavigateFolder(folder.id);if (isMobile) setMobileSidebarOpen(false);}}
            className={`flex items-center gap-1.5 flex-1 transition-colors rounded-lg text-left text-[13px] ${isActive ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-accent/50"}`}
            style={{ padding: "6px 8px", paddingLeft: depth * 16 + 8 }}>

            {hasChildren ?
            <span onClick={(e) => {e.stopPropagation();toggleExpand(folder.id);}} className="flex cursor-pointer">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span> :

            <span className="w-3.5" />
            }
            <FolderIcon className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate flex-1">{folder.name}</span>
            {isLocked && (
            isUnlocked ?
            <Unlock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" /> :
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />)
            }
            {fileCount > 0 && <span className="text-[10px] text-muted-foreground/60">{fileCount}</span>}
          </button>
          {isActive && getPerm(folder.id) === "admin" &&
          <button type="button"
            onClick={(e) => {e.stopPropagation();setConfirmDeleteFolder(folder);}}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive"
            title="Move to Trash">

              <Trash2 className="w-3 h-3" />
            </button>
          }
        </div>
        {hasChildren && isExpanded && children.map((c) => renderFolderItem(c, depth + 1))}
      </div>);

  };

  // ── Render Folder Tree (tree-view component) ──
  const renderTreeFolder = (folder: CloudFolder): React.ReactNode => {
    const children = getChildren(folder.id);
    const isLocked = folder.isLocked;
    const isUnlocked = isFolderUnlocked(folder);
    const isActive = currentFolderId === folder.id && !showTrash;
    const fileCount = files.filter((f) => f.folderId === folder.id && !f.isDeleted).length;

    const closedIcon = isLocked && !isUnlocked
      ? <FolderIcon className="size-4 shrink-0 text-amber-500" />
      : <FolderIcon className="size-4 shrink-0 text-primary/70" />;
    const openedIcon = <FolderOpen className="size-4 shrink-0 text-primary" />;

    const label = (
      <span className={`flex items-center gap-1 flex-1 min-w-0 ${isActive ? "font-semibold text-accent-foreground" : "text-muted-foreground"}`}>
        <span className="truncate">{folder.name}</span>
        {isLocked && (isUnlocked
          ? <Unlock className="w-3 h-3 shrink-0 text-muted-foreground/40" />
          : <Lock className="w-3 h-3 shrink-0 text-amber-500" />
        )}
        {fileCount > 0 && <span className="text-[10px] text-muted-foreground/50 ml-0.5">{fileCount}</span>}
      </span>
    );

    const navigate = () => {
      attemptNavigateFolder(folder.id);
      if (isMobile) setMobileSidebarOpen(false);
    };

    if (children.length === 0) {
      return (
        <TreeFile
          key={folder.id}
          value={folder.id}
          fileIcon={closedIcon}
          handleSelect={navigate}
          isSelect={isActive}
          className={`px-2 py-1 ${isActive ? "bg-accent" : ""}`}
        >
          {label}
        </TreeFile>
      );
    }

    return (
      <TreeFolder
        key={folder.id}
        value={folder.id}
        element={folder.name}
        openIcon={openedIcon}
        closeIcon={closedIcon}
        onSelect={navigate}
        isSelect={isActive}
        className={`px-2 py-1 ${isActive ? "bg-accent" : ""}`}
      >
        {children.map((c) => renderTreeFolder(c))}
      </TreeFolder>
    );
  };

  // ── Context Menu Items ──
  const getFileMenuItems = (file: CloudFile): ActionMenuEntry[] => {
    const perm = getPerm(file.folderId);
    const canW = perm === "write" || perm === "admin";
    const fileSections = sections.filter((s) => s.folderId === file.folderId);
    const sectionMenuItems: ActionMenuEntry[] = fileSections.length > 0 ? [
    ...fileSections.map((s) => ({ id: `sec-${s.id}`, label: s.name, onClick: () => moveFileToSection(file.id, s.id), show: canW && file.sectionId !== s.id })),
    { id: "sec-remove", label: "Remove from section", onClick: () => moveFileToSection(file.id, null), show: canW && !!file.sectionId }] :
    [];
    return [
    { id: "download", icon: <Download className="w-3.5 h-3.5" />, label: "Download", onClick: () => { toast.info("Download started"); addAuditEntry({ userId, action: `Downloaded "${file.name}"`, category: "cloud", details: `${formatFileSize(file.size)} from ${getFolderPath(file.folderId, folders)}`, icon: "📥" }); }, show: !!perm },
    { id: "rename", icon: <Pencil className="w-3.5 h-3.5" />, label: "Rename", onClick: () => {setRenamingFileId(file.id);setRenameValue(file.name);}, show: canW },
    { id: "move", icon: <Move className="w-3.5 h-3.5" />, label: "Move to folder", onClick: () => {setMoveFileModal(file);setMoveTarget(null);}, show: canW },
    ...(sectionMenuItems.length > 0 ? [
    { id: "move-section", icon: <Layers className="w-3.5 h-3.5" />, label: `Move to Section → ${file.sectionId ? sections.find((s) => s.id === file.sectionId)?.name || "" : ""}`, onClick: () => {}, show: false },
    ...sectionMenuItems] :
    []),
    { id: "link", icon: <Link2 className="w-3.5 h-3.5" />, label: "Copy link", onClick: () => toast.success("Link copied"), show: !!perm },
    { id: "details", icon: <Eye className="w-3.5 h-3.5" />, label: "View details", onClick: () => setPreviewFile(file), show: !!perm },
    { id: "perms", icon: <Shield className="w-3.5 h-3.5" />, label: "Manage permissions", onClick: () => setPermissionsModal(file.folderId), show: perm === "admin" },
    { type: "divider" as const },
    { id: "trash", icon: <Trash2 className="w-3.5 h-3.5" />, label: "Move to Trash", onClick: () => moveToTrash(file.id), destructive: true, show: canW }];

  };

  // ── Folder action menu items (for password) ──
  const getFolderMenuItems = (folder: CloudFolder): ActionMenuEntry[] => {
    const perm = getPerm(folder.id);
    const canAdmin = perm === "admin";
    const canSetPassword = canAdmin;
    const canChangePassword = canAdmin || folder.passwordSetBy === userId;

    return [
    ...(folder.isLocked && isFolderUnlocked(folder) ? [
    { id: "lock-now", icon: <Lock className="w-3.5 h-3.5" />, label: "Lock Now", onClick: () => lockFolderNow(folder.id) }] :
    []),
    ...(!folder.isLocked && canSetPassword ? [
    { id: "set-password", icon: <Lock className="w-3.5 h-3.5" />, label: "Set Password...", onClick: () => setSetPasswordFolder(folder) }] :
    []),
    ...(folder.isLocked && canChangePassword ? [
    { id: "change-password", icon: <Lock className="w-3.5 h-3.5" />, label: "Change Password...", onClick: () => setChangePasswordFolder(folder) },
    { id: "remove-password", icon: <Unlock className="w-3.5 h-3.5" />, label: "Remove Password", onClick: () => setRemovePasswordFolder(folder), destructive: true }] :
    [])];

  };

  // ── Trash Item Card ──
  const renderTrashItem = (file: CloudFile) => {
    const icon = getFileTypeIcon(file.type);
    const daysLeft = daysUntilPermanentDelete(file);
    const severity = getCountdownSeverity(daysLeft);
    const deletedByUser = file.deletedBy ? getUserById(file.deletedBy) : null;

    return (
      <div key={file.id} onClick={() => setTrashPreviewFile(file)} className="border border-border rounded-xl p-4 mb-2 cursor-pointer hover:border-primary/40 hover:bg-accent/30 hover:shadow-md transition-all duration-200 bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-2xl">{icon.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
              <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                <span>{formatFileSize(file.size)} • Deleted {file.deletedAt ? formatDistanceToNow(file.deletedAt, { addSuffix: true }) : ""} {deletedByUser ? `by ${deletedByUser.displayName}` : ""}</span>
                <span className="flex items-center gap-1">
                  <FolderIcon className="w-3 h-3" /> Was in: {file.originalFolderPath || "Unknown"}
                </span>
                <span className={`flex items-center gap-1 font-medium ${severity === "critical" ? "text-destructive" : severity === "warning" ? "text-yellow-600 dark:text-yellow-500" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />
                  Auto-deletes in {daysLeft} days
                  {severity === "warning" && " ⚠️"}
                  {severity === "critical" && " 🔴"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button"
            onClick={(e) => { e.stopPropagation(); handleRecover(file); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">

            <RotateCcw className="w-3 h-3" /> Recover
          </button>
          {isOwnerOrAdmin &&
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmPermDelete(file); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium">

              <Trash2 className="w-3 h-3" /> Delete Permanently
            </button>
          }
        </div>
      </div>);

  };

  // ── File Card (Grid) ──
  const renderFileCard = (file: CloudFile) => {
    const icon = getFileTypeIcon(file.type);
    return (
      <div
        key={file.id}
        draggable={canWrite}
        onDragStart={(e) => e.dataTransfer.setData("fileId", file.id)}
        onClick={() => setPreviewFile(file)}
        onDoubleClick={() => toast.info("Download started")}
        className="relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">

        <div className="flex items-start justify-between mb-3">
          <span className="text-[28px]">{icon.emoji}</span>
          <ActionMenu
            trigger={<MoreVertical className="w-4 h-4" />}
            items={getFileMenuItems(file)} />

        </div>
        {renamingFileId === file.id ?
        <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {if (e.key === "Enter") renameFile(file.id);if (e.key === "Escape") setRenamingFileId(null);}}
        onBlur={() => renameFile(file.id)}
        className="w-full text-xs p-1.5 rounded border border-input bg-background" /> :

        <p className="truncate text-[13px] font-semibold text-foreground mb-1">{file.name}</p>
        }
        <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDistanceToNow(file.modifiedAt, { addSuffix: true })}</p>
      </div>);

  };

  // ── File Row (List) ──
  const renderFileRow = (file: CloudFile) => {
    const icon = getFileTypeIcon(file.type);
    const owner = getUserById(file.ownerId);
    return (
      <tr key={file.id} draggable={canWrite} onDragStart={(e) => e.dataTransfer.setData("fileId", file.id)}
      onClick={() => setPreviewFile(file)} onDoubleClick={() => toast.info("Download started")} className="border-b border-border hover:bg-accent/30 transition-colors relative cursor-pointer">
        <td className="p-2.5"><span className="text-lg">{icon.emoji}</span></td>
        <td className="p-2.5 text-[13px] font-medium text-foreground">
          {renamingFileId === file.id ?
          <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") renameFile(file.id);if (e.key === "Escape") setRenamingFileId(null);}}
          onBlur={() => renameFile(file.id)}
          className="text-xs p-1 rounded border border-input bg-background w-full" /> :

          <span className="truncate block max-w-[250px]">{file.name}</span>
          }
        </td>
        <td className="p-2.5 text-xs text-muted-foreground">{formatFileSize(file.size)}</td>
        <td className="p-2.5 text-xs text-muted-foreground">{formatDistanceToNow(file.modifiedAt, { addSuffix: true })}</td>
        <td className="p-2.5 text-xs text-muted-foreground">{owner?.displayName || "—"}</td>
        <td className="p-2.5">
          <ActionMenu
            trigger={<MoreVertical className="w-4 h-4" />}
            items={getFileMenuItems(file)} />

        </td>
      </tr>);

  };

  // ── Sectioned file rendering ──
  const hasSections = currentSections.length > 0;
  const unsectionedFiles = useMemo(() =>
  sortedFiles.filter((f) => !f.sectionId || !currentSections.some((s) => s.id === f.sectionId)),
  [sortedFiles, currentSections]
  );

  const handleSectionDrop = (e: React.DragEvent, sectionId: string | null) => {
    e.preventDefault();
    setDragOverSectionId(null);
    const fileId = e.dataTransfer.getData("fileId");
    if (fileId) moveFileToSection(fileId, sectionId);
  };

  const renderSectionedContent = () => {
    if (!hasSections) return null;

    const renderInlineRenameSection = (section: FolderSection) => {
      if (renamingSectionId !== section.id) return null;
      return (
        <div className="flex items-center gap-2 px-4 py-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus value={sectionRenameValue}
            onChange={(e) => setSectionRenameValue(e.target.value)}
            onKeyDown={(e) => {if (e.key === "Enter") renameSection(section.id, sectionRenameValue);if (e.key === "Escape") setRenamingSectionId(null);}}
            onBlur={() => renameSection(section.id, sectionRenameValue)}
            className="text-xs p-1.5 rounded border border-input bg-background flex-1 max-w-[200px]"
            placeholder="Section name" />

          <button type="button" onClick={() => renameSection(section.id, sectionRenameValue)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">✓</button>
          <button type="button" onClick={() => setRenamingSectionId(null)} className="text-xs px-2 py-1 rounded border border-border">✕</button>
        </div>);

    };

    const sectionFiles = (sectionId: string) => sortedFiles.filter((f) => f.sectionId === sectionId);

    return (
      <>
        {/* New section inline input (top) */}
        {newSectionName !== null && !newSectionAfter &&
        <div className="flex items-center gap-2 mb-3 px-4">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") createSection(newSectionName);if (e.key === "Escape") {setNewSectionName(null);setNewSectionAfter(null);}}}
          className="text-xs p-1.5 rounded border border-input bg-background flex-1 max-w-[200px]" placeholder="New section name" />
            <button type="button" onClick={() => createSection(newSectionName)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">✓</button>
            <button type="button" onClick={() => {setNewSectionName(null);setNewSectionAfter(null);}} className="text-xs px-2 py-1 rounded border border-border">✕</button>
          </div>
        }

        {currentSections.map((section) => {
          const sFiles = sectionFiles(section.id);
          const isCollapsed = collapsedSections.has(section.id);

          return (
            <div key={section.id} className="mb-2">
              {renamingSectionId === section.id ?
              renderInlineRenameSection(section) :

              <SectionHeader
                section={section}
                fileCount={sFiles.length}
                isCollapsed={isCollapsed}
                canWrite={canWrite}
                onToggle={() => toggleSectionCollapse(section.id)}
                onRename={() => {setRenamingSectionId(section.id);setSectionRenameValue(section.name);}}
                onAddBelow={() => {setNewSectionName("");setNewSectionAfter(section.id);}}
                onMoveUp={() => moveSectionOrder(section.id, "up")}
                onMoveDown={() => moveSectionOrder(section.id, "down")}
                onDelete={() => setDeleteSectionConfirm(section)}
                dragOver={dragOverSectionId === section.id}
                onDragOver={(e) => {e.preventDefault();setDragOverSectionId(section.id);}}
                onDragLeave={() => setDragOverSectionId(null)}
                onDrop={(e) => handleSectionDrop(e, section.id)} />

              }
              <div className="h-px bg-border mx-4" />
              {!isCollapsed &&
              <div className="transition-all duration-200">
                  {sFiles.length === 0 &&
                <p className="text-xs text-muted-foreground/50 px-10 py-3 italic">No files in this section</p>
                }
                  {view === "grid" ?
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 py-2">
                      {sFiles.map(renderFileCard)}
                    </div> :
                sFiles.length > 0 ?
                <div className="overflow-x-auto px-4 py-1">
                      <table className="w-full min-w-[500px]">
                        <tbody>{sFiles.map(renderFileRow)}</tbody>
                      </table>
                    </div> :
                null}
                </div>
              }

              {/* Inline "add section after" input */}
              {newSectionName !== null && newSectionAfter === section.id &&
              <div className="flex items-center gap-2 my-2 px-4">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {if (e.key === "Enter") createSection(newSectionName, newSectionAfter);if (e.key === "Escape") {setNewSectionName(null);setNewSectionAfter(null);}}}
                className="text-xs p-1.5 rounded border border-input bg-background flex-1 max-w-[200px]" placeholder="New section name" />
                  <button type="button" onClick={() => createSection(newSectionName, newSectionAfter)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">✓</button>
                  <button type="button" onClick={() => {setNewSectionName(null);setNewSectionAfter(null);}} className="text-xs px-2 py-1 rounded border border-border">✕</button>
                </div>
              }
            </div>);

        })}

        {/* Other Files section */}
        {unsectionedFiles.length > 0 &&
        <div className="mb-2">
            <SectionHeader
            section={null} fileCount={unsectionedFiles.length}
            isCollapsed={collapsedSections.has("__other__")} canWrite={false}
            onToggle={() => toggleSectionCollapse("__other__")}
            dragOver={dragOverSectionId === "__other__"}
            onDragOver={(e) => {e.preventDefault();setDragOverSectionId("__other__");}}
            onDragLeave={() => setDragOverSectionId(null)}
            onDrop={(e) => handleSectionDrop(e, null)} />

            <div className="h-px bg-border mx-4" />
            {!collapsedSections.has("__other__") && (
          view === "grid" ?
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 py-2">
                  {unsectionedFiles.map(renderFileCard)}
                </div> :

          <div className="overflow-x-auto px-4 py-1">
                  <table className="w-full min-w-[500px]">
                    <tbody>{unsectionedFiles.map(renderFileRow)}</tbody>
                  </table>
                </div>)

          }
          </div>
        }
      </>);

  };

  // ── Upload Modal ──
  const UploadModal = () => {
    const [uploadFiles, setUploadFiles] = useState<string[]>([]);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [uploading, setUploading] = useState(false);

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadFiles(Array.from(e.target.files || []).map((f) => f.name));
    };
    const handleUpload = () => {
      if (uploadFiles.length === 0) return;
      setUploading(true);
      const prog: Record<string, number> = {};
      uploadFiles.forEach((f) => {prog[f] = 0;});
      setProgress({ ...prog });
      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = { ...prev };
          let allDone = true;
          Object.keys(next).forEach((k) => {next[k] = Math.min(100, next[k] + Math.floor(Math.random() * 25) + 10);if (next[k] < 100) allDone = false;});
          if (allDone) {clearInterval(interval);setTimeout(() => mockUpload(uploadFiles), 300);}
          return next;
        });
      }, 400);
    };
    const targetFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId)?.name : "Root";

    return (
      <ModalOverlay onClose={() => setShowUploadModal(false)}>
        <h2 className="text-lg font-bold text-foreground mb-4">Upload Files</h2>
        <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-8 mb-4 hover:border-primary/50 transition-colors bg-muted/30">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Drop files here or click to browse</span>
          <input type="file" multiple className="hidden" onChange={handleFiles} />
        </label>
        <p className="text-xs text-muted-foreground mb-3">Destination: <strong className="text-foreground">{targetFolder}</strong></p>
        {uploadFiles.length > 0 &&
        <div className="flex flex-col gap-2 mb-4">
            {uploadFiles.map((name) =>
          <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">{name}</span>
                  {uploading && <span className="text-xs text-primary">{progress[name] || 0}%</span>}
                </div>
                {uploading && <Progress value={progress[name] || 0} className="h-1.5" />}
              </div>
          )}
          </div>
        }
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setShowUploadModal(false)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
          <button type="button" onClick={handleUpload} disabled={uploadFiles.length === 0 || uploading} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </ModalOverlay>);

  };

  // ── Permissions Modal ──
  const PermissionsModalUI = () => {
    const folder = folders.find((f) => f.id === permissionsModal);
    if (!folder) return null;
    const [localPerms, setLocalPerms] = useState<{userId: string;level: PermissionLevel;}[]>(
      folder.permissions.length > 0 ? [...folder.permissions] : ALL_USERS.map((u) => ({ userId: u.id, level: "read" as PermissionLevel }))
    );
    const [inherit, setInherit] = useState(folder.inheritPermissions);
    const save = () => {
      setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, permissions: localPerms, inheritPermissions: inherit } : f));
      setPermissionsModal(null);
      toast.success("Permissions saved");
      const summary = inherit ? "Inherited from parent" : localPerms.map(p => { const u = ALL_USERS.find(u => u.id === p.userId); return `${u?.displayName}: ${p.level}`; }).join(", ");
      addAuditEntry({ userId, action: `Updated permissions on "${folder.name}"`, category: "cloud", details: summary, icon: "🔒" });
    };
    return (
      <ModalOverlay onClose={() => setPermissionsModal(null)}>
        <h2 className="text-base font-bold text-foreground mb-4">Permissions: {folder.name}</h2>
        {folder.parentId &&
        <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-foreground">
            <input type="checkbox" checked={inherit} onChange={(e) => setInherit(e.target.checked)} className="rounded" />
            Inherit from parent
          </label>
        }
        {!inherit &&
        <div className="flex flex-col gap-2">
            {ALL_USERS.map((u) => {
            const perm = localPerms.find((p) => p.userId === u.id);
            return (
              <div key={u.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/15 text-primary text-[10px] font-bold">
                      {u.displayName.charAt(0)}
                    </div>
                    <span className="text-sm text-foreground">{u.displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{u.role}</span>
                  </div>
                  <select className="text-xs p-1 rounded border border-input bg-background" value={perm?.level || "read"}
                onChange={(e) => {
                  const level = e.target.value as PermissionLevel;
                  setLocalPerms((prev) => {const next = prev.filter((p) => p.userId !== u.id);next.push({ userId: u.id, level });return next;});
                }}>
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>);

          })}
          </div>
        }
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={() => setPermissionsModal(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
          <button type="button" onClick={save} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
        </div>
      </ModalOverlay>);

  };

  // ── New Folder Modal ──
  const NewFolderModal = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState<string>(currentFolderId || "");
    const [permMode, setPermMode] = useState<"inherit" | "custom">("inherit");
    const [customPerms, setCustomPerms] = useState<{userId: string;level: PermissionLevel;}[]>(
      ALL_USERS.map((u) => ({ userId: u.id, level: "read" as PermissionLevel }))
    );
    const [error, setError] = useState("");

    const locationPerm = location ? getPerm(location) : isOwnerOrAdmin ? "admin" : null;
    const canCreate = locationPerm === "write" || locationPerm === "admin";

    const handleCreate = () => {
      if (!name.trim()) {setError("Folder name is required");return;}
      if (name.length > 100) {setError("Max 100 characters");return;}
      const dupes = folders.filter((f) => f.parentId === (location || null) && !f.isDeleted && f.name.toLowerCase() === name.trim().toLowerCase());
      if (dupes.length > 0) {setError("A folder with this name already exists here");return;}
      const id = `f_${Date.now()}`;
      const parentPerms = location ? folders.find((f) => f.id === location)?.permissions || [] : [];
      setFolders((prev) => [...prev, {
        id, name: name.trim(), parentId: location || null,
        permissions: permMode === "inherit" ? parentPerms : customPerms,
        inheritPermissions: permMode === "inherit" && !!location,
        createdAt: new Date()
      }]);
      setShowNewFolderModal(false);
      toast.success(`Folder "${name.trim()}" created`);
    };

    const renderPickerItem = (folder: CloudFolder, depth: number): React.ReactNode => {
      const children = getChildren(folder.id);
      return (
        <div key={folder.id}>
          <button type="button"
            onClick={() => setLocation(folder.id)}
            className={`flex items-center gap-2 w-full text-left text-sm rounded-md px-2 py-1.5 transition-colors ${location === folder.id ? "bg-primary/15 text-primary font-medium" : "text-foreground hover:bg-accent/50"}`}
            style={{ paddingLeft: depth * 16 + 8 }}>

            <FolderIcon className="w-3.5 h-3.5 text-primary" />
            {folder.name}
          </button>
          {children.map((c) => renderPickerItem(c, depth + 1))}
        </div>);

    };

    return (
      <ModalOverlay onClose={() => setShowNewFolderModal(false)}>
        <h2 className="text-base font-bold text-foreground mb-4">New Folder</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Folder Name *</label>
            <input
              autoFocus value={name} onChange={(e) => {setName(e.target.value);setError("");}}
              className={`w-full text-sm p-2.5 rounded-lg border ${error ? "border-destructive" : "border-input"} bg-background focus:outline-none focus:ring-1 focus:ring-ring`}
              placeholder="Enter folder name" />

            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description (optional)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-input bg-background resize-none h-16 focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add a description" />

          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Location</label>
            <div className="max-h-[150px] overflow-y-auto border border-border rounded-lg p-1 bg-muted/30">
              {rootFolders.map((f) => renderPickerItem(f, 0))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Permissions</label>
            <div className="flex flex-col gap-2">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${permMode === "inherit" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                <input type="radio" name="perm" checked={permMode === "inherit"} onChange={() => setPermMode("inherit")} className="text-primary" />
                <span className="text-sm text-foreground">Inherit from parent (recommended)</span>
              </label>
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${permMode === "custom" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
                <input type="radio" name="perm" checked={permMode === "custom"} onChange={() => setPermMode("custom")} className="text-primary" />
                <span className="text-sm text-foreground">Custom permissions</span>
              </label>
            </div>
            {permMode === "custom" &&
            <div className="flex flex-col gap-1.5 mt-3 border border-border rounded-lg p-2">
                {ALL_USERS.map((u) => {
                const p = customPerms.find((cp) => cp.userId === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[9px] font-bold">{u.displayName.charAt(0)}</div>
                        <span className="text-xs text-foreground">{u.displayName}</span>
                        <span className="text-[9px] text-muted-foreground">{u.role}</span>
                      </div>
                      <select className="text-[11px] p-0.5 rounded border border-input bg-background" value={p?.level || "read"}
                    onChange={(e) => {
                      const lv = e.target.value as PermissionLevel;
                      setCustomPerms((prev) => {const next = prev.filter((x) => x.userId !== u.id);next.push({ userId: u.id, level: lv });return next;});
                    }}>
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>);

              })}
              </div>
            }
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={() => setShowNewFolderModal(false)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
          <button type="button" onClick={handleCreate} disabled={!canCreate}
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          title={!canCreate ? "You don't have permission to create folders here" : undefined}>
            Create Folder
          </button>
        </div>
      </ModalOverlay>);

  };

  // ── Folder Picker ──
  const FolderPicker = ({ selected, onSelect }: {selected: string | null;onSelect: (id: string) => void;}) => {
    const renderPickerItem = (folder: CloudFolder, depth: number): React.ReactNode => {
      const children = getChildren(folder.id);
      return (
        <div key={folder.id}>
          <button type="button"
            onClick={() => onSelect(folder.id)}
            className={`flex items-center gap-2 w-full text-left text-sm rounded-md px-2 py-1.5 transition-colors ${selected === folder.id ? "bg-primary/15 text-primary font-medium" : "text-foreground hover:bg-accent/50"}`}
            style={{ paddingLeft: depth * 16 + 8 }}>

            <FolderIcon className="w-3.5 h-3.5 text-primary" />
            {folder.name}
          </button>
          {children.map((c) => renderPickerItem(c, depth + 1))}
        </div>);

    };
    return (
      <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg p-1 bg-muted/30">
        {rootFolders.map((f) => renderPickerItem(f, 0))}
      </div>);

  };

  // ── Sidebar Content ──
  const sidebarContent =
  <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        <button type="button"
        onClick={() => {setCurrentFolderId(null);setShowTrash(false);setShowStorage(false);if (isMobile) setMobileSidebarOpen(false);}}
        className={`flex items-center gap-2 w-full rounded-lg text-left text-[13px] transition-colors ${!currentFolderId && !showTrash && !showStorage ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-accent/50"}`}
        style={{ padding: "6px 11px" }}>

          <Home className="w-4 h-4 shrink-0" />
          <span>Home</span>
        </button>

        <div className="h-px bg-border my-1" />

        {/* Folder navigation */}
        {rootFolders.map((f) => renderFolderItem(f, 0))}

        <div className="h-px bg-border my-2" />

        <button type="button"
        onClick={() => {setShowTrash(true);setCurrentFolderId(null);setShowStorage(false);if (isMobile) setMobileSidebarOpen(false);}}
        className={`flex items-center gap-2 w-full rounded-lg text-left text-[13px] transition-colors ${showTrash ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:bg-accent/50"}`}
        style={{ padding: "6px 11px" }}>

          <Trash2 className="w-4 h-4 shrink-0" />
          <span>Trash</span>
          {trashCount > 0 &&
        <span className="ml-auto text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full font-medium">{trashCount}</span>
        }
        </button>
      </div>

      <button type="button"
        onClick={() => {setShowStorage(true);setCurrentFolderId(null);setShowTrash(false);if (isMobile) setMobileSidebarOpen(false);}}
        className={`p-3 border-t border-border w-full text-left transition-colors ${showStorage ? "bg-accent/50" : "hover:bg-muted/50"}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] ${showStorage ? "text-foreground font-semibold" : "text-muted-foreground"}`}>Storage</span>
          <span className="text-[11px] text-muted-foreground">{USED_STORAGE_GB} / {TOTAL_STORAGE_GB} GB</span>
        </div>
        <Progress value={USED_STORAGE_GB / TOTAL_STORAGE_GB * 100} className="h-1.5" />
      </button>
    </div>;


  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile sidebar toggle + breadcrumb bar */}
      {(isMobile || currentFolderId && !showTrash || showTrash) &&
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
          {isMobile &&
        <button type="button" onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors">
              <FolderIcon className="w-4 h-4" />
            </button>
        }
          {!showTrash && currentFolderId && <Breadcrumb folderId={currentFolderId} folders={folders} onNavigate={attemptNavigateFolder} />}
          {showTrash && <span className="text-xs text-muted-foreground">🗑️ Trash — files are permanently deleted after 60 days</span>}
        </div>
      }

      {/* Two-panel layout */}
      <div className="flex gap-0 flex-1 bg-card border border-border rounded-2xl overflow-hidden">
        {!isMobile &&
        <div className="w-[240px] border-r border-border bg-muted/30 shrink-0">
            {sidebarContent}
          </div>
        }

        {isMobile && mobileSidebarOpen &&
        <>
            <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setMobileSidebarOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 z-[70] w-[260px] bg-popover border-r border-border">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Folders</span>
                <button type="button" onClick={() => setMobileSidebarOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              {sidebarContent}
            </div>
          </>
        }

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          {!showStorage && (currentFolderId || showTrash || searchQuery.trim()) &&
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                {showTrash &&
              <span className="text-xs text-muted-foreground">
                    {trashCount} item{trashCount !== 1 ? "s" : ""} • {formatFileSize(trashSize)}
                  </span>
              }
                {showTrash && userRole === "owner" && trashCount > 0 &&
              <button type="button" onClick={() => setConfirmEmptyTrash(true)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium">
                    Empty Trash
                  </button>
              }
                {currentPerm === "admin" && currentFolderId && !showTrash &&
              <button type="button" onClick={() => setPermissionsModal(currentFolderId)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors">
                    <Shield className="w-3 h-3" /> Permissions
                  </button>
              }
                {/* Lock status & actions */}
                {currentFolder?.isLocked && currentFolderUnlocked && !showTrash &&
              <>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Unlock className="w-3 h-3 text-muted-foreground/60" /> Unlocked
                      {currentFolderUnlockState?.expiresAt &&
                  <span className="text-muted-foreground/50">• Auto-locks in {Math.max(1, Math.ceil((currentFolderUnlockState.expiresAt - Date.now()) / 60000))} min</span>
                  }
                      {!currentFolderUnlockState?.expiresAt && !isOwner && <span className="text-muted-foreground/50">• This session</span>}
                    </span>
                    {!isOwner &&
                <button type="button" onClick={() => lockFolderNow(currentFolderId!)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 transition-colors">
                        <Lock className="w-3 h-3" /> Lock Now
                      </button>
                }
                  </>
              }
                {/* Password management in toolbar for admin */}
                {currentFolder && !showTrash && getPerm(currentFolderId!) === "admin" &&
              <span onClick={(e) => e.stopPropagation()}>
                    {getFolderMenuItems(currentFolder).length > 0 &&
                <ActionMenu trigger={<Lock className="w-3.5 h-3.5 text-muted-foreground" />} items={getFolderMenuItems(currentFolder)} />
                }
                  </span>
              }
              </div>
              {!showTrash &&
            <div className="flex items-center gap-2">
                  {canWrite &&
              <>
                      <button type="button" onClick={() => setShowUploadModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </button>
                      <button type="button" onClick={(e) => {e.stopPropagation();setShowNewFolderModal(true);}} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors">
                        <FolderPlus className="w-3.5 h-3.5" /> Folder
                      </button>
                    </>
              }
                  <div className="flex border border-border rounded-md overflow-hidden">
                    <button type="button" onClick={() => setView("grid")} className={`p-1 ${view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setView("list")} className={`p-1 ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select className="text-[11px] p-1 rounded border border-input bg-background" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                  </select>
                </div>
            }
            </div>
          }

          {/* Content */}
          <div className={`flex-1 ${showStorage ? "overflow-hidden" : !currentFolderId && !showTrash && !searchQuery.trim() ? "overflow-hidden p-4" : "overflow-y-auto p-4"}`}>
            {showStorage &&
            <StorageOverview
              files={files}
              folders={folders}
              userId={userId}
              userRole={userRole}
              getPerm={getPerm}
              onNavigateFolder={(id) => { navigateFolder(id); setShowStorage(false); }}
              onPreviewFile={(file) => setPreviewFile(file)}
              onMoveToTrash={moveToTrash}
              onRenameFile={(id, name) => renameFile(id, name)}
              onMoveFile={(f) => { setMoveFileModal(f); setMoveTarget(null); }}
            />
            }
            {!showStorage && !currentFolderId && !showTrash && !searchQuery.trim() &&
            <EmptyStateSearch
              files={files}
              folders={folders}
              getPerm={getPerm}
              onNavigateFolder={attemptNavigateFolder}
              onSelectFile={(file) => {
                setCurrentFolderId(file.folderId);
                setShowTrash(false);
                let cur: string | null = file.folderId;
                const toExpand = new Set(expandedFolders);
                while (cur) {
                  const f = folders.find((x) => x.id === cur);
                  if (!f) break;
                  toExpand.add(cur);
                  cur = f.parentId;
                }
                setExpandedFolders(toExpand);
                setPreviewFile(file);
              }} />

            }

            {/* New folder inline (legacy fallback) */}
            {newFolderName !== null &&
            <div className="flex items-center gap-2 mb-3">
                <FolderIcon className="w-5 h-5 shrink-0 text-primary" />
                <input autoFocus className="text-sm p-1.5 rounded-lg border border-input bg-background max-w-[250px]"
              value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter") createFolder();if (e.key === "Escape") setNewFolderName(null);}}
              placeholder="Folder name" />
                <button type="button" onClick={createFolder} className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground">✓</button>
                <button type="button" onClick={() => setNewFolderName(null)} className="text-xs px-2.5 py-1 rounded-md border border-border">✕</button>
              </div>
            }

            {/* Subfolders — only when inside a folder */}
            {currentFolderId && currentSubfolders.length > 0 &&
            <div className="mb-4">
                <div className={`grid gap-2 ${view === "grid" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-1"}`}>
                  {currentSubfolders.map((sf) =>
                <button type="button" key={sf.id} onClick={() => attemptNavigateFolder(sf.id)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card text-left hover:bg-accent/50 transition-colors">
                      <FolderIcon className="w-5 h-5 shrink-0 text-primary" />
                      <span className="text-[13px] font-medium text-foreground">{sf.name}</span>
                      {sf.isLocked && (
                  isFolderUnlocked(sf) ?
                  <Unlock className="w-3.5 h-3.5 text-muted-foreground/40" /> :
                  <Lock className="w-3.5 h-3.5 text-amber-500" />)
                  }
                      <span className="text-[10px] text-muted-foreground ml-auto">{files.filter((f) => f.folderId === sf.id && !f.isDeleted).length}</span>
                    </button>
                )}
                </div>
              </div>
            }

            {/* Trash view */}
            {showTrash && sortedFiles.map(renderTrashItem)}

            {/* Sectioned content */}
            {!showTrash && (currentFolderId || searchQuery.trim()) && hasSections && !searchQuery.trim() && renderSectionedContent()}

            {/* Non-sectioned: Files - grid */}
            {!showTrash && (currentFolderId || searchQuery.trim()) && (!hasSections || searchQuery.trim()) && view === "grid" &&
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedFiles.map(renderFileCard)}
              </div>
            }

            {/* Non-sectioned: Files - list */}
            {!showTrash && (currentFolderId || searchQuery.trim()) && (!hasSections || searchQuery.trim()) && view === "list" && sortedFiles.length > 0 &&
            <div className="overflow-x-auto rounded-xl">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["", "Name", "Size", "Modified", "Owner", ""].map((h) =>
                    <th key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-2.5 text-left">{h}</th>
                    )}
                    </tr>
                  </thead>
                  <tbody>{sortedFiles.map(renderFileRow)}</tbody>
                </table>
              </div>
            }

            {(currentFolderId || showTrash || searchQuery.trim()) && sortedFiles.length === 0 && currentSubfolders.length === 0 &&
            <div className="flex flex-col items-center justify-center gap-2 min-h-[200px] text-muted-foreground">
                <Cloud className="w-8 h-8" />
                <p className="text-sm">{showTrash ? "Trash is empty" : searchQuery ? "No files found" : "This folder is empty"}</p>
              </div>
            }
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showUploadModal && <UploadModal />}
      {permissionsModal && <PermissionsModalUI />}
      {showNewFolderModal && <NewFolderModal />}

      {/* ── PASSWORD UNLOCK PROMPT ── */}
      {unlockPromptFolder &&
      <ModalOverlay onClose={() => setUnlockPromptFolder(null)}>
          <div className="text-center">
            <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">This folder is protected</h3>
            <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1.5">
              <FolderIcon className="w-4 h-4 text-primary" /> {unlockPromptFolder.name}
            </p>
            <p className="text-xs text-muted-foreground mb-6">Enter the password to access this folder's contents.</p>

            <div className="text-left mb-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <input
                type={unlockShowPassword ? "text" : "password"}
                value={unlockPassword}
                onChange={(e) => {setUnlockPassword(e.target.value);setUnlockError("");}}
                onKeyDown={(e) => {if (e.key === "Enter") handleUnlock();}}
                disabled={!!lockoutUntil}
                autoFocus
                className={`w-full text-sm p-3 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${unlockError ? "border-destructive animate-[shake_0.3s_ease]" : "border-input"}`}
                placeholder="Enter password" />

                <button type="button" onClick={() => setUnlockShowPassword(!unlockShowPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {unlockShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {unlockError && !lockoutUntil &&
            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {unlockError}
                </p>
            }
              {lockoutUntil &&
            <div className="mt-3 text-center">
                  <p className="text-xs text-destructive flex items-center justify-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Too many failed attempts
                  </p>
                  <p className="text-sm font-semibold text-destructive">
                    Try again in {Math.floor(lockoutRemaining / 60)}:{(lockoutRemaining % 60).toString().padStart(2, "0")}
                  </p>
                </div>
            }
            </div>

            {/* Remember options */}
            <div className="flex flex-col gap-2 mb-5 text-left">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input type="radio" name="remember" checked={unlockRemember === "session"} onChange={() => setUnlockRemember("session")} className="text-primary" />
                Remember for this session
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input type="radio" name="remember" checked={unlockRemember === "timed"} onChange={() => setUnlockRemember("timed")} className="text-primary" />
                Remember for {unlockPromptFolder.lockAutoTimeoutMinutes || 30} minutes
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setUnlockPromptFolder(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
              <button type="button" onClick={handleUnlock} disabled={!unlockPassword || !!lockoutUntil}
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" /> Unlock
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/60 mt-4">Forgot password? Contact the folder owner.</p>
          </div>
        </ModalOverlay>
      }

      {/* ── SET PASSWORD MODAL ── */}
      {setPasswordFolder && <SetPasswordModal folder={setPasswordFolder} onClose={() => setSetPasswordFolder(null)} onSet={handleSetPassword} />}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {changePasswordFolder && <ChangePasswordModal folder={changePasswordFolder} onClose={() => setChangePasswordFolder(null)} onChange={handleChangePassword} />}

      {/* ── REMOVE PASSWORD MODAL ── */}
      {removePasswordFolder && <RemovePasswordModal folder={removePasswordFolder} onClose={() => setRemovePasswordFolder(null)} onRemove={handleRemovePassword} />}

      {/* Delete Section Confirmation */}
      {deleteSectionConfirm &&
      <ModalOverlay onClose={() => setDeleteSectionConfirm(null)}>
          <h2 className="text-base font-bold text-foreground mb-4">Delete Section</h2>
          <p className="text-sm text-muted-foreground mb-2">Delete section "<strong className="text-foreground">{deleteSectionConfirm.name}</strong>"?</p>
          <p className="text-sm text-muted-foreground mb-4">
            The {files.filter((f) => f.sectionId === deleteSectionConfirm.id).length} file(s) inside will be moved to Other Files. No files will be deleted.
          </p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setDeleteSectionConfirm(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={() => deleteSection(deleteSectionConfirm)} className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete Section</button>
          </div>
        </ModalOverlay>
      }

      {/* Permanent Delete Confirmation */}
      {confirmPermDelete &&
      <ModalOverlay onClose={() => setConfirmPermDelete(null)}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-bold text-foreground">Permanent Deletion</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Are you sure you want to <strong className="text-foreground">permanently delete</strong> this file?</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-3">
            <span className="text-lg">{getFileTypeIcon(confirmPermDelete.type).emoji}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{confirmPermDelete.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(confirmPermDelete.size)}</p>
            </div>
          </div>
          <p className="text-xs text-destructive mb-4 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> This action cannot be undone. The file will be gone forever.</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setConfirmPermDelete(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={() => permanentDelete(confirmPermDelete.id)} className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete Permanently</button>
          </div>
        </ModalOverlay>
      }

      {/* Empty Trash Confirmation */}
      {confirmEmptyTrash &&
      <ModalOverlay onClose={() => setConfirmEmptyTrash(false)}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-bold text-foreground">Empty Trash</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Permanently delete <strong className="text-foreground">all {trashCount} items</strong> in Trash?</p>
          <p className="text-sm text-muted-foreground mb-3">This will free {formatFileSize(trashSize)} of storage.</p>
          <p className="text-xs text-destructive mb-4 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setConfirmEmptyTrash(false)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={emptyTrash} className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Empty Trash</button>
          </div>
        </ModalOverlay>
      }

      {/* Delete Folder Confirmation */}
      {confirmDeleteFolder &&
      <ModalOverlay onClose={() => setConfirmDeleteFolder(null)}>
          <h2 className="text-base font-bold text-foreground mb-4">Delete Folder</h2>
          <p className="text-sm text-muted-foreground mb-2">Delete "<strong className="text-foreground">{confirmDeleteFolder.name}</strong>" and all its contents?</p>
          <div className="p-3 rounded-lg bg-muted/50 mb-3 text-sm">
            <p className="flex items-center gap-2 text-foreground"><FolderIcon className="w-4 h-4 text-primary" /> {confirmDeleteFolder.name}</p>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              📄 {files.filter((f) => f.folderId === confirmDeleteFolder.id && !f.isDeleted).length} files ({formatFileSize(files.filter((f) => f.folderId === confirmDeleteFolder.id && !f.isDeleted).reduce((s, f) => s + f.size, 0))})
            </p>
            <p className="text-xs text-muted-foreground ml-6">
              📁 {folders.filter((f) => f.parentId === confirmDeleteFolder.id && !f.isDeleted).length} subfolder(s)
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">All files will be moved to Trash and can be recovered within 60 days.</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setConfirmDeleteFolder(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={() => deleteFolderAndContents(confirmDeleteFolder)} className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Move to Trash</button>
          </div>
        </ModalOverlay>
      }

      {/* Recover File Dialog */}
      {recoverFile &&
      <ModalOverlay onClose={() => setRecoverFile(null)}>
          <h2 className="text-base font-bold text-foreground mb-4">Recover File</h2>
          <p className="text-sm text-muted-foreground mb-2">The original folder no longer exists:</p>
          <p className="text-sm text-foreground mb-4 flex items-center gap-1"><FolderIcon className="w-3.5 h-3.5 text-primary" /> {recoverFile.originalFolderPath || "Unknown"}</p>
          <p className="text-sm text-muted-foreground mb-3">Choose where to restore this file:</p>
          <div className="flex flex-col gap-2 mb-4">
            <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${recoverTarget === "root" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
              <input type="radio" name="recover" value="root" checked={recoverTarget === "root"} onChange={() => setRecoverTarget("root")} className="text-primary" />
              <FolderIcon className="w-3.5 h-3.5 text-primary" /><span className="text-sm text-foreground">Projects (root)</span>
            </label>
            <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${recoverTarget === "choose" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}>
              <input type="radio" name="recover" value="choose" checked={recoverTarget === "choose"} onChange={() => setRecoverTarget("choose")} className="text-primary" />
              <FolderIcon className="w-3.5 h-3.5 text-primary" /><span className="text-sm text-foreground">Choose folder...</span>
            </label>
          </div>
          {recoverTarget === "choose" && <FolderPicker selected={moveTarget} onSelect={setMoveTarget} />}
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setRecoverFile(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={executeRecover} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Recover Here</button>
          </div>
        </ModalOverlay>
      }

      {/* Move File Modal */}
      {moveFileModal &&
      <ModalOverlay onClose={() => setMoveFileModal(null)}>
          <h2 className="text-base font-bold text-foreground mb-4">Move "{moveFileModal.name}"</h2>
          <p className="text-sm text-muted-foreground mb-3">Select destination folder:</p>
          <FolderPicker selected={moveTarget} onSelect={setMoveTarget} />
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setMoveFileModal(null)} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
            <button type="button" onClick={() => moveTarget && moveFileToFolder(moveFileModal.id, moveTarget)} disabled={!moveTarget}
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">Move</button>
          </div>
        </ModalOverlay>
      }

      {/* Trash Preview Drawer */}
      {trashPreviewFile &&
      <TrashPreviewDrawer
        file={trashPreviewFile}
        files={sortedFiles}
        isOwnerOrAdmin={isOwnerOrAdmin}
        onClose={() => setTrashPreviewFile(null)}
        onNavigate={(f) => setTrashPreviewFile(f)}
        onRecover={(f) => { setTrashPreviewFile(null); handleRecover(f); }}
        onPermanentDelete={(f) => { setTrashPreviewFile(null); setConfirmPermDelete(f); }}
      />
      }

      {/* File Preview Drawer */}
      {previewFile &&
      <FilePreviewDrawer
        file={previewFile}
        files={sortedFiles}
        folders={folders}
        permission={previewFile.folderId !== "trash" ? getPerm(previewFile.folderId) : null}
        onClose={() => setPreviewFile(null)}
        onNavigate={(f) => setPreviewFile(f)}
        onRename={(id, name) => renameFile(id, name)}
        onMoveToTrash={moveToTrash}
        onMoveFile={(f) => {setMoveFileModal(f);setMoveTarget(null);}}
        onNavigateFolder={navigateFolder}
        onUpdateDescription={updateFileDescription} />

      }
    </div>);

};

/* ── Set Password Modal ── */
function SetPasswordModal({ folder, onClose, onSet }: {folder: CloudFolder;onClose: () => void;onSet: (folderId: string, password: string, timeout: number) => void;}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [timeout, setTimeout] = useState(30);
  const [error, setError] = useState("");
  const strength = getPasswordStrength(password);
  const handleSubmit = () => {
    if (password.length < 6) {setError("Password must be at least 6 characters");return;}
    if (password !== confirm) {setError("Passwords do not match");return;}
    onSet(folder.id, password, timeout);
  };
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Set Folder Password</h2>
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5"><FolderIcon className="w-4 h-4 text-primary" /> {folder.name}</p>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">New Password</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => {setPassword(e.target.value);setError("");}}
            className="w-full text-sm p-2.5 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Enter password" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 &&
          <div className="mt-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength.level]}`} style={{ width: `${strength.percent}%` }} /></div>
              <p className={`text-[11px] mt-1 ${strength.level === "strong" ? "text-green-500" : strength.level === "good" ? "text-yellow-500" : strength.level === "fair" ? "text-orange-500" : "text-destructive"}`}>{strength.label}</p>
            </div>
          }
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => {setConfirm(e.target.value);setError("");}}
          className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Confirm password" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Auto-lock after</label>
          <select value={timeout} onChange={(e) => setTimeout(Number(e.target.value))} className="text-sm p-2 rounded-lg border border-input bg-background w-full">
            <option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={0}>Never</option>
          </select>
        </div>
        {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
        <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Anyone with this password can access the folder. Share only with trusted people.</p>
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
        <button type="button" onClick={handleSubmit} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Set Password</button>
      </div>
    </ModalOverlay>);

}

/* ── Change Password Modal ── */
function ChangePasswordModal({ folder, onClose, onChange }: {folder: CloudFolder;onClose: () => void;onChange: (folderId: string, newPassword: string) => void;}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const strength = getPasswordStrength(newPw);
  const handleSubmit = () => {
    const correctPw = MOCK_FOLDER_PASSWORDS[folder.id] || folder.passwordHash;
    if (currentPw !== correctPw) {setError("Current password is incorrect");return;}
    if (newPw.length < 6) {setError("New password must be at least 6 characters");return;}
    if (newPw !== confirmPw) {setError("Passwords do not match");return;}
    onChange(folder.id, newPw);
  };
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Change Folder Password</h2>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Current Password</label>
          <input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => {setCurrentPw(e.target.value);setError("");}}
          className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Enter current password" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">New Password</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => {setNewPw(e.target.value);setError("");}}
            className="w-full text-sm p-2.5 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Enter new password" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPw.length > 0 &&
          <div className="mt-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength.level]}`} style={{ width: `${strength.percent}%` }} /></div>
              <p className={`text-[11px] mt-1 ${strength.level === "strong" ? "text-green-500" : strength.level === "good" ? "text-yellow-500" : strength.level === "fair" ? "text-orange-500" : "text-destructive"}`}>{strength.label}</p>
            </div>
          }
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Confirm New Password</label>
          <input type="password" value={confirmPw} onChange={(e) => {setConfirmPw(e.target.value);setError("");}}
          className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Confirm new password" />
        </div>
        {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
        <button type="button" onClick={handleSubmit} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Change Password</button>
      </div>
    </ModalOverlay>);

}

/* ── Remove Password Modal ── */
function RemovePasswordModal({ folder, onClose, onRemove }: {folder: CloudFolder;onClose: () => void;onRemove: (folderId: string) => void;}) {
  const [currentPw, setCurrentPw] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = () => {
    const correctPw = MOCK_FOLDER_PASSWORDS[folder.id] || folder.passwordHash;
    if (currentPw !== correctPw) {setError("Incorrect password");return;}
    onRemove(folder.id);
  };
  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Remove Folder Password</h2>
      <p className="text-sm text-muted-foreground mb-4">Enter the current password to remove protection from <strong className="text-foreground flex items-center gap-1 inline-flex"><FolderIcon className="w-3.5 h-3.5 text-primary" /> {folder.name}</strong>.</p>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Current Password</label>
        <input type="password" value={currentPw} onChange={(e) => {setCurrentPw(e.target.value);setError("");}} autoFocus
        onKeyDown={(e) => {if (e.key === "Enter") handleSubmit();}}
        className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Enter current password" />
        {error && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
      </div>
      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> All users with folder access will be able to view contents without a password.</p>
      <div className="flex gap-2 justify-end mt-5">
        <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">Cancel</button>
        <button type="button" onClick={handleSubmit} className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Remove Password</button>
      </div>
    </ModalOverlay>);

}

/* ── Reusable Modal Overlay ── */
function ModalOverlay({ children, onClose }: {children: React.ReactNode;onClose: () => void;}) {
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} />
      <div className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[460px] max-h-[90vh] overflow-y-auto bg-popover border border-border rounded-2xl p-6 shadow-2xl">
        {children}
      </div>
    </>);

}

export default CloudPage;