import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { precargarPantallas, router } from "./app/router";
import { precargarModales } from "./components/ModalHost";
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

  /*
   * Lo que no hace falta para pintar se trae después, con la app ya en
   * pantalla. Si el móvil pide ahorrar datos no se adelanta nada: cada
   * pantalla se descargará cuando se abra, como antes.
   */
  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexion?.saveData) return;
    const espera = window.setTimeout(() => precargarPantallas(precargarModales), 1500);
    return () => window.clearTimeout(espera);
  }, []);

  return <RouterProvider router={router} />;
}
