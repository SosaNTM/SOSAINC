import { useEffect } from "react";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Escape: close any open modal via custom event
      if (e.key === "Escape") {
        document.dispatchEvent(new CustomEvent("SOSA INC:close-modal"));
      }

      // Cmd/Ctrl+K: future command palette placeholder
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // TODO: Open command palette
        console.info("Command palette shortcut triggered — implement Cmd+K palette");
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
