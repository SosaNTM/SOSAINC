import { Pencil, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface Column<T> {
  key: string;
  label: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface SettingsTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  emptyMessage: string;
  emptyIcon: LucideIcon;
}

export function SettingsTable<T extends { id: string }>({
  columns, data, onEdit, onDelete, emptyMessage, emptyIcon: EmptyIcon,
}: SettingsTableProps<T>) {
  return (
    <div style={{
      background: "var(--surface-hover, transparent)",
      border: "0.5px solid var(--glass-border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {data.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "48px 0", gap: 8,
        }}>
          <EmptyIcon style={{ width: 40, height: 40, color: "var(--text-tertiary)", strokeWidth: 1.2 }} />
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 13,
            color: "var(--text-tertiary)",
          }}>{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "10px 16px",
            background: "var(--surface-hover, transparent)",
            borderBottom: "1px solid var(--divider)",
          }}>
            {columns.map((col) => (
              <div key={col.key} style={{
                flex: col.width ? `0 0 ${col.width}` : 1,
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
              }}>{col.label}</div>
            ))}
            <div style={{ flex: "0 0 80px", textAlign: "right",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--text-tertiary)",
            }}>Azioni</div>
          </div>

          {/* Rows */}
          {data.map((item, i) => (
            <TableRow
              key={item.id}
              item={item}
              columns={columns}
              onEdit={onEdit}
              onDelete={onDelete}
              isLast={i === data.length - 1}
            />
          ))}
        </>
      )}
    </div>
  );
}

function TableRow<T extends { id: string }>({
  item, columns, onEdit, onDelete, isLast,
}: {
  item: T;
  columns: Column<T>[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center",
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--divider)",
        background: hovered ? "var(--surface-hover)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {columns.map((col) => (
        <div key={col.key} style={{
          flex: col.width ? `0 0 ${col.width}` : 1,
          fontFamily: "var(--font-body)", fontSize: 13,
          color: "var(--text-secondary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {col.render ? col.render(item) : String((item as any)[col.key] ?? "")}
        </div>
      ))}
      <div style={{ flex: "0 0 80px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ActionIcon icon={Pencil} hoverColor="var(--accent-primary)" onClick={() => onEdit(item)} />
        <ActionIcon icon={Trash2} hoverColor="var(--color-error)" onClick={() => onDelete(item)} />
      </div>
    </div>
  );
}

function ActionIcon({ icon: Icon, hoverColor, onClick }: { icon: LucideIcon; hoverColor: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 4,
        borderRadius: "var(--radius-sm)",
        color: hovered ? hoverColor : "var(--text-tertiary)",
        transition: "color 0.15s",
      }}
    >
      <Icon style={{ width: 15, height: 15 }} />
    </button>
  );
}
