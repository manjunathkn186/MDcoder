import { create } from "zustand";

interface ExportUiState {
  open: boolean;
  openDialog: () => void;
  close: () => void;
}

export const useExportUi = create<ExportUiState>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  close: () => set({ open: false }),
}));
