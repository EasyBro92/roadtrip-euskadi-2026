import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";

/**
 * Si ahora mismo la app está en oscuro, ya resuelto el "automático".
 *
 * Lee el mismo atributo que escribe `resolveAndApplyTheme` en el `<html>`, en
 * vez de volver a decidirlo por su cuenta: si hubiera dos sitios resolviendo
 * lo mismo acabarían discrepando, que es exactamente lo que pasó con el CSS
 * del tema automático.
 */
export function useTemaOscuro(): boolean {
  const tema = useSettingsStore((s) => s.settings.theme);
  const [oscuro, setOscuro] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");

  useEffect(() => {
    const leer = () => setOscuro(document.documentElement.getAttribute("data-theme") === "dark");
    leer();

    /*
     * El atributo lo escribe otro efecto, que puede correr después que éste;
     * y en "automático" cambia solo al anochecer, sin que cambie el ajuste.
     * Mirando el atributo directamente da igual quién lo haya puesto y
     * cuándo.
     */
    const observador = new MutationObserver(leer);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observador.disconnect();
  }, [tema]);

  return oscuro;
}
