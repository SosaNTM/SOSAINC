import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        style={{
          background: "#0a0a0a",
          border: "1px solid rgba(232,255,0,0.15)",
          borderRadius: 10,
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              color: "#e8ff00",
              letterSpacing: 1,
            }}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              background: "transparent",
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            style={{
              background: destructive ? "#ef4444" : "#e8ff00",
              color: destructive ? "#fff" : "#000",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
