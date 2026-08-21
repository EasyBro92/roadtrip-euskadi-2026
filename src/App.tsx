import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { useSettingsStore, resolveAndApplyTheme } from "./stores/useSettingsStore";

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    resolveAndApplyTheme(theme);
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
