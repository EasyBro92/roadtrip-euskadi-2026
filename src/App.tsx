import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { useSettingsStore, resolveAndApplyTheme } from "./stores/useSettingsStore";

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);

  /*
   * En "automático" hay que estar atento, no resolver una vez y olvidarse:
   * el móvil cambia solo a oscuro al anochecer, y con la app abierta —que es
   * justo cuando pasa, conduciendo— se quedaría en claro hasta reiniciarla.
   */
  useEffect(() => {
    resolveAndApplyTheme(theme);
    if (theme !== "auto") return;

    const preferencia = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => resolveAndApplyTheme("auto");
    preferencia.addEventListener("change", alCambiar);
    return () => preferencia.removeEventListener("change", alCambiar);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => useSettingsStore.getState().updateSettings({ reducedMotion: mediaQuery.matches });
    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  return <RouterProvider router={router} />;
}
