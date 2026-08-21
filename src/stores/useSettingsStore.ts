import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, type AppSettings } from "../types";
import { createZustandStorageAdapter } from "../services/storage/StorageService";

interface SettingsStoreState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleCategoryVisibility: (category: string) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      toggleCategoryVisibility: (category) =>
        set((state) => ({
          settings: {
            ...state.settings,
            categoryVisibility: { ...state.settings.categoryVisibility, [category]: !(state.settings.categoryVisibility[category] ?? true) },
          },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: "settings", storage: createJSONStorage(() => createZustandStorageAdapter("settings")) },
  ),
);

/** Resuelve "auto" contra prefers-color-scheme y aplica el atributo data-theme al <html>. */
export function resolveAndApplyTheme(theme: AppSettings["theme"]): void {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}
