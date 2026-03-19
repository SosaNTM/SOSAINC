import { useState } from "react";
import { Eye, EyeOff, Lock, Upload, Download, ShieldAlert, FileText, CreditCard, Award, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export interface PrivateInfo {
  codiceFiscale: string;
  iban: string;
  cfUpdatedAt?: Date;
  cfUpdatedBy?: string;
  ibanUpdatedAt?: Date;
  ibanUpdatedBy?: string;
}

export interface EmployeeDocument {
  id: string;
  category: "cv" | "id_card" | "certificate" | "other";
  fileName: string;
  fileSize: string;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cv: <FileText className="w-4 h-4 text-blue-400" />,
  id_card: <CreditCard className="w-4 h-4 text-amber-400" />,
  certificate: <Award className="w-4 h-4 text-emerald-400" />,
  other: <FolderOpen className="w-4 h-4 text-gray-400" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  cv: "CV / Resume",
  id_card: "ID Card",
  certificate: "Certificate",
  other: "Other",
};

interface PersonalSpaceProps {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  privateInfo: PrivateInfo;
  documents: EmployeeDocument[];
  canEdit: boolean;
  canViewSensitive: boolean;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onAddressChange: (v: string) => void;
}

export function PersonalSpace({
  firstName,
  lastName,
  dateOfBirth,
  address,
  privateInfo,
  documents,
  canEdit,
  canViewSensitive,
  onFirstNameChange,
  onLastNameChange,
  onAddressChange,
}: PersonalSpaceProps) {
  const [showCF, setShowCF] = useState(false);
  const [showIBAN, setShowIBAN] = useState(false);

  const maskValue = (val: string, visibleStart: number, visibleEnd: number) => {
    if (val.length <= visibleStart + visibleEnd) return val;
    return val.slice(0, visibleStart) + "•".repeat(val.length - visibleStart - visibleEnd) + val.slice(-visibleEnd);
  };

  const handleReveal = (field: "cf" | "iban") => {
    if (field === "cf") setShowCF(!showCF);
    else setShowIBAN(!showIBAN);
    if ((field === "cf" && !showCF) || (field === "iban" && !showIBAN)) {
      toast.info(`${field === "cf" ? "Codice Fiscale" : "IBAN"} revealed — logged in audit`);
    }
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    (acc[doc.category] = acc[doc.category] || []).push(doc);
    return acc;
  }, {} as Record<string, EmployeeDocument[]>);

  return (
    <div className="flex flex-col gap-5">
      {/* Personal Info Section */}
      <SectionBox title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <input
              className="w-full text-sm p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              readOnly={!canEdit}
              maxLength={50}
            />
          </FormField>
          <FormField label="Last Name" required>
            <input
              className="w-full text-sm p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              readOnly={!canEdit}
              maxLength={50}
            />
          </FormField>
        </div>

        <FormField label="Date of Birth" required>
          <input
            className="w-full text-sm p-2.5 rounded-lg border border-input bg-muted text-muted-foreground cursor-not-allowed"
            value={dateOfBirth}
            readOnly
          />
        </FormField>

        <FormField label="Address" required>
          <input
            className="w-full text-sm p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            readOnly={!canEdit}
            maxLength={200}
          />
        </FormField>

        {canEdit && (
          <button type="button"
            onClick={() => toast.success("Profile saved")}
            className="self-end text-sm px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        )}
      </SectionBox>

      {/* Sensitive Fields */}
      {canViewSensitive && (
        <SectionBox
          title="Sensitive Data"
          badge={
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldAlert className="w-3 h-3 text-red-400" /> Sensitive
            </span>
          }
        >
          <MaskedField
            label="Codice Fiscale"
            value={privateInfo.codiceFiscale}
            maskedValue={maskValue(privateInfo.codiceFiscale, 4, 1)}
            show={showCF}
            onToggle={() => handleReveal("cf")}
            updatedAt={privateInfo.cfUpdatedAt}
            updatedBy={privateInfo.cfUpdatedBy}
          />
          <MaskedField
            label="IBAN"
            value={privateInfo.iban}
            maskedValue={maskValue(privateInfo.iban, 4, 4)}
            show={showIBAN}
            onToggle={() => handleReveal("iban")}
            updatedAt={privateInfo.ibanUpdatedAt}
            updatedBy={privateInfo.ibanUpdatedBy}
          />
          <div
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground rounded-lg p-2.5 mt-1"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            <Lock className="w-3 h-3 shrink-0" />
            Every reveal is recorded in the audit log.
          </div>
        </SectionBox>
      )}

      {/* Documents */}
      <SectionBox title="Documents">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const docs = groupedDocs[cat] || [];
          return (
            <div key={cat} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                {CATEGORY_ICONS[cat]} {label}
              </p>
              {docs.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 pl-6">No documents</p>
              ) : (
                docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/5 transition-colors group"
                  >
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {doc.fileSize} · {format(doc.uploadedAt, "MMM d, yyyy")} · by {doc.uploadedBy}
                      </p>
                    </div>
                    <button type="button" className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
        {canEdit && (
          <button type="button" className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
            <Upload className="w-3 h-3" /> Upload Document
          </button>
        )}
      </SectionBox>
    </div>
  );
}

function SectionBox({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: "#0d1117",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {badge}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function MaskedField({
  label,
  value,
  maskedValue,
  show,
  onToggle,
  updatedAt,
  updatedBy,
}: {
  label: string;
  value: string;
  maskedValue: string;
  show: boolean;
  onToggle: () => void;
  updatedAt?: Date;
  updatedBy?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          className="w-full text-sm p-2.5 rounded-lg border border-input bg-muted text-foreground font-mono"
          value={show ? value : maskedValue}
          readOnly
        />
        <button type="button"
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground shrink-0"
          title={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {updatedAt && updatedBy && (
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Last updated: {format(updatedAt, "MMM d, yyyy")} by {updatedBy}
        </p>
      )}
    </div>
  );
}
