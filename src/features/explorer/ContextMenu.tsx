// Phase 6: ContextMenu was promoted to a generic UI primitive in `src/ui`.
// This module remains as a thin re-export so explorer-local imports keep
// working without changes.
export { ContextMenu, type MenuItem, type ContextMenuProps } from "@ui/ContextMenu";
