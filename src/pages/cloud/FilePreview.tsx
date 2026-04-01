// FilePreview.tsx — Password modals and ModalOverlay for the Cloud module.
// The actual file preview drawer lives in @/components/cloud/FilePreviewDrawer.

import { useState } from "react";
import { FolderIcon, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { MOCK_FOLDER_PASSWORDS } from "@/lib/cloudStore";
import { getPasswordStrength, strengthColors, ModalOverlay } from "./cloud.types";
import type { CloudFolder } from "./cloud.types";

/* ── Set Password Modal ── */
export function SetPasswordModal({
  folder,
  onClose,
  onSet,
}: {
  folder: CloudFolder;
  onClose: () => void;
  onSet: (folderId: string, password: string, timeout: number) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [error, setError] = useState("");
  const strength = getPasswordStrength(password);

  const handleSubmit = () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    onSet(folder.id, password, timeoutMinutes);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Set Folder Password</h2>
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
        <FolderIcon className="w-4 h-4 text-primary" /> {folder.name}
      </p>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full text-sm p-2.5 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength.level]}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  strength.level === "strong"
                    ? "text-green-500"
                    : strength.level === "good"
                      ? "text-yellow-500"
                      : strength.level === "fair"
                        ? "text-orange-500"
                        : "text-destructive"
                }`}
              >
                {strength.label}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Confirm password"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Auto-lock after
          </label>
          <select
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
            className="text-sm p-2 rounded-lg border border-input bg-background w-full"
          >
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={0}>Never</option>
          </select>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Anyone with this
          password can access the folder. Share only with trusted people.
        </p>
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button
          type="button"
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Set Password
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ── Change Password Modal ── */
export function ChangePasswordModal({
  folder,
  onClose,
  onChange,
}: {
  folder: CloudFolder;
  onClose: () => void;
  onChange: (folderId: string, newPassword: string) => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const strength = getPasswordStrength(newPw);

  const handleSubmit = () => {
    const correctPw = MOCK_FOLDER_PASSWORDS[folder.id] || folder.passwordHash;
    if (currentPw !== correctPw) {
      setError("Current password is incorrect");
      return;
    }
    if (newPw.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords do not match");
      return;
    }
    onChange(folder.id, newPw);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Change Folder Password</h2>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Current Password
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={currentPw}
            onChange={(e) => { setCurrentPw(e.target.value); setError(""); }}
            className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Enter current password"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setError(""); }}
              className="w-full text-sm p-2.5 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPw.length > 0 && (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength.level]}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  strength.level === "strong"
                    ? "text-green-500"
                    : strength.level === "good"
                      ? "text-yellow-500"
                      : strength.level === "fair"
                        ? "text-orange-500"
                        : "text-destructive"
                }`}
              >
                {strength.label}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => { setConfirmPw(e.target.value); setError(""); }}
            className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Confirm new password"
          />
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <button
          type="button"
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Change Password
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ── Remove Password Modal ── */
export function RemovePasswordModal({
  folder,
  onClose,
  onRemove,
}: {
  folder: CloudFolder;
  onClose: () => void;
  onRemove: (folderId: string) => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const correctPw = MOCK_FOLDER_PASSWORDS[folder.id] || folder.passwordHash;
    if (currentPw !== correctPw) {
      setError("Incorrect password");
      return;
    }
    onRemove(folder.id);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-base font-bold text-foreground mb-4">Remove Folder Password</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Enter the current password to remove protection from{" "}
        <strong className="text-foreground flex items-center gap-1 inline-flex">
          <FolderIcon className="w-3.5 h-3.5 text-primary" /> {folder.name}
        </strong>
        .
      </p>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Current Password
        </label>
        <input
          type="password"
          value={currentPw}
          onChange={(e) => { setCurrentPw(e.target.value); setError(""); }}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="w-full text-sm p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Enter current password"
        />
        {error && (
          <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-amber-500" /> All users with
        folder access will be able to view contents without a password.
      </p>
      <div className="flex gap-2 justify-end mt-5">
        <button
          type="button"
          onClick={onClose}
          className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Remove Password
        </button>
      </div>
    </ModalOverlay>
  );
}

export { ModalOverlay };
