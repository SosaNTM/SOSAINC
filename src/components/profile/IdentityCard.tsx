import { useRef, useState, useEffect } from "react";
import { Camera, Download, Briefcase, MapPin, Calendar, Clock, Award } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { RoleBadge } from "@/components/RoleBadge";
import { toast } from "sonner";
import type { Role } from "@/lib/permissions";

export interface EmployeeContract {
  type: "full_time" | "part_time" | "contractor" | "intern";
  startDate: Date;
  endDate?: Date;
  hoursPerWeek: number;
  level: string;
}

export interface EmployeeProfile {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
  dateOfBirth: Date;
  city: string;
  country: string;
  jobTitle: string;
  status: "active" | "onboarding" | "suspended" | "on_leave";
  contract: EmployeeContract;
  createdAt: Date;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(16,185,129,0.12)", text: "#10b981", label: "Active" },
  onboarding: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "Onboarding" },
  suspended: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "Suspended" },
  on_leave: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "On Leave" },
};

const CONTRACT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contractor: "Contractor",
  intern: "Intern",
};

interface IdentityCardProps {
  employee: EmployeeProfile;
  canEdit: boolean;
  isAdmin: boolean;
  localAvatar: string | null;
  onAvatarChange: (url: string) => void;
}

export function IdentityCard({ employee, canEdit, isAdmin, localAvatar, onAvatarChange }: IdentityCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarSrc = localAvatar || employee.avatar;
  const initials = employee.firstName.charAt(0) + employee.lastName.charAt(0);
  const age = differenceInYears(new Date(), employee.dateOfBirth);
  const status = STATUS_STYLES[employee.status] || STATUS_STYLES.active;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      onAvatarChange(url);
      toast.success("Avatar updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className="p-7 flex flex-col items-center gap-4"
      style={{
        background: "var(--sosa-bg-2)",
        border: "1px solid var(--sosa-border)",
      }}
    >
      {/* Avatar */}
      <div className="relative group">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={employee.displayName}
            className="object-cover rounded-2xl"
            style={{ width: 120, height: 120 }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: 120,
              height: 120,
              background: "var(--sosa-bg-3)",
              border: "1px solid var(--sosa-border)",
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 700, color: "var(--portal-accent)", fontFamily: "var(--font-mono)" }}>
              {initials}
            </span>
          </div>
        )}
        {canEdit && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      </div>

      {/* Name + Age + Location */}
      <div className="text-center">
        <h1 className="text-[22px] font-bold text-foreground">{employee.displayName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {age} years · <MapPin className="w-3 h-3 inline -mt-0.5" /> {employee.city}, {employee.country}
        </p>
      </div>

      {/* Status + Role */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bg, color: status.text }}
        >
          {status.label}
        </span>
        <RoleBadge role={employee.role as Role} />
      </div>

      {/* Job Title */}
      <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
        {employee.jobTitle}
      </div>

      {/* Contract Details */}
      <div
        className="w-full rounded-xl p-4 mt-1 space-y-2.5"
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contract Details</p>

        <DetailRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Type" value={CONTRACT_LABELS[employee.contract.type]} />
        <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Start" value={format(employee.contract.startDate, "MMM d, yyyy")} />
        {employee.contract.endDate && (
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="End" value={format(employee.contract.endDate, "MMM d, yyyy")} />
        )}
        <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Hours/Week" value={`${employee.contract.hoursPerWeek}h`} />
        <DetailRow icon={<Award className="w-3.5 h-3.5" />} label="Level" value={employee.contract.level} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full mt-1">
        {canEdit && (
          <button type="button"
            onClick={() => toast.info("Edit profile coming soon")}
            className="flex-1 text-xs font-medium py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Edit Profile
          </button>
        )}
        {isAdmin && (
          <button type="button"
            onClick={() => toast.info("PDF export coming soon")}
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 px-4 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Download className="w-3 h-3" /> PDF
          </button>
        )}
      </div>

      {/* Joined date */}
      <p className="text-[11px] text-muted-foreground">
        Joined {format(employee.createdAt, "MMMM yyyy")}
      </p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
