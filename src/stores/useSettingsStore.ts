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

/**
 * Deja escrito en el `<html>` si toca claro u oscuro, ya resuelto.
 *
 * En "automático" esto **quitaba** el atributo, y el CSS del oscuro
 * automático buscaba `[data-theme="auto"]`: un selector que no podía casar
 * nunca porque el atributo ya no estaba. Resultado, comprobado en el
 * navegador con el sistema en oscuro y el ajuste en automático: `--color-bg`
 * se quedaba en `#fafaf7`. El modo automático no se puso oscuro jamás.
 *
 * Resolviendo aquí, el CSS sólo necesita saber de "light" y "dark", y la
 * paleta de noche vive en un único bloque en vez de estar copiada en dos —
 * que era lo que permitía que se separasen sin que nadie lo notara.
 */
export function resolveAndApplyTheme(theme: AppSettings["theme"]): void {
  const oscuro = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
}
