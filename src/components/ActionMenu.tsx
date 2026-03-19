import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ActionMenuItem {
  id: string;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  show?: boolean;
}

export interface ActionMenuDivider {
  type: "divider";
}

export type ActionMenuEntry = ActionMenuItem | ActionMenuDivider;

interface ActionMenuProps {
  trigger: ReactNode;
  items: ActionMenuEntry[];
  /** Extra class for trigger wrapper */
  triggerClassName?: string;
}

export function ActionMenu({ trigger, items, triggerClassName }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const isMobile = useIsMobile();
  const [focusIndex, setFocusIndex] = useState(0);

  const visibleItems = items.filter((item) => {
    if ("type" in item && item.type === "divider") return true;
    if ("show" in item && item.show === false) return false;
    return true;
  });

  const actionItems = visibleItems.filter((i) => !("type" in i && i.type === "divider")) as ActionMenuItem[];

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current || isMobile) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const MENU_WIDTH = 220;
    const MENU_MAX_HEIGHT = 320;
    const PAD = 8;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom - PAD;
    const fitsBelow = spaceBelow >= Math.min(MENU_MAX_HEIGHT, visibleItems.length * 40 + 12);
    const top = fitsBelow
      ? rect.bottom + 4
      : Math.max(PAD, rect.top - Math.min(MENU_MAX_HEIGHT, visibleItems.length * 40 + 12) - 4);

    const left = rect.right - MENU_WIDTH > PAD
      ? rect.right - MENU_WIDTH
      : Math.max(PAD, rect.left);

    setPosition({ top, left });
    setFocusIndex(0);
  }, [isOpen, isMobile, visibleItems.length]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener("scroll", close, { capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [isOpen]);

  // Close on resize
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [isOpen]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusIndex((p) => Math.min(p + 1, actionItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIndex((p) => Math.max(p - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          actionItems[focusIndex]?.onClick();
          setIsOpen(false);
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
      }
    },
    [isOpen, focusIndex, actionItems]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  if (visibleItems.length === 0) return null;

  let actionIdx = -1;

  return (
    <>
      <button type="button"
        ref={triggerRef}
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={triggerClassName || "flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors shrink-0"}
      >
        {trigger}
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 99 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            {/* Menu */}
            <div
              ref={menuRef}
              role="menu"
              className={`${isMobile ? "fixed inset-x-0 bottom-0" : "fixed"} overflow-y-auto`}
              style={{
                zIndex: 100,
                ...(isMobile
                  ? {
                      maxHeight: "50vh",
                      borderRadius: "16px 16px 0 0",
                      padding: "8px 8px 32px",
                      animation: "actionMenuSlideUp 0.2s ease",
                    }
                  : {
                      top: position.top,
                      left: position.left,
                      minWidth: 200,
                      maxWidth: 240,
                      maxHeight: 320,
                      borderRadius: 12,
                      padding: 6,
                      animation: "actionMenuFadeIn 0.12s ease",
                    }),
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {isMobile && (
                <div className="flex justify-center mb-2 pt-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                </div>
              )}
              {visibleItems.map((item, i) => {
                if ("type" in item && item.type === "divider") {
                  return (
                    <div
                      key={`div-${i}`}
                      className="my-1 mx-2"
                      style={{ height: 1, background: "hsl(var(--border) / 0.5)" }}
                    />
                  );
                }
                actionIdx++;
                const isDestructive = (item as ActionMenuItem).destructive;
                const isFocused = actionIdx === focusIndex;
                return (
                  <button type="button"
                    key={(item as ActionMenuItem).id}
                    role="menuitem"
                    tabIndex={isFocused ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      (item as ActionMenuItem).onClick();
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-2.5 w-full text-left rounded-lg transition-colors duration-100 ${
                      isDestructive
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-foreground hover:bg-accent/50"
                    } ${isFocused && !isDestructive ? "bg-accent/50" : ""} ${isFocused && isDestructive ? "bg-destructive/10" : ""}`}
                    style={{
                      padding: isMobile ? "12px 16px" : "9px 14px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      background: undefined,
                    }}
                  >
                    {(item as ActionMenuItem).icon && (
                      <span className="shrink-0 opacity-70" style={{ width: 16, height: 16 }}>
                        {(item as ActionMenuItem).icon}
                      </span>
                    )}
                    {(item as ActionMenuItem).label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
