import { useEffect } from "react";

export default function useKeyboardShortcuts({
    undo,
    redo,
    duplicateSelectedNode,
    removeSelectedNode,
    togglePlay
} = {}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isTyping =
                tag === "input" ||
                tag === "textarea" ||
                document.activeElement?.isContentEditable;

            if (isTyping) return;

            const mod = e.ctrlKey || e.metaKey;

            if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
                e.preventDefault();
                undo?.();
                return;
            }

            if ((mod && e.shiftKey && e.key.toLowerCase() === "z") || (mod && e.key.toLowerCase() === "y")) {
                e.preventDefault();
                redo?.();
                return;
            }

            if (mod && e.key.toLowerCase() === "d") {
                e.preventDefault();
                duplicateSelectedNode?.();
                return;
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeSelectedNode?.();
                return;
            }

            if (e.code === "Space") {
                e.preventDefault();
                togglePlay?.();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, duplicateSelectedNode, removeSelectedNode, togglePlay]);
}
