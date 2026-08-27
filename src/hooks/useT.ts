import { useCallback } from "react";
import { resolverIdioma, traducir, type IdiomaReal } from "../i18n";
import { useSettingsStore } from "../stores/useSettingsStore";

/**
 * La función de traducir, ya atada al idioma elegido.
 *
 * Se usa como `t("Mis viajes")`. La clave es el texto en castellano, así que
 * una pantalla sin migrar sigue leyéndose igual y se puede traducir de una en
 * una sin dejar la app rota.
 */
export function useT(): { t: (clave: string, valores?: Record<string, string | number>) => string; idioma: IdiomaReal } {
  const elegido = useSettingsStore((s) => s.settings.language);
  const idioma = resolverIdioma(elegido);

  const t = useCallback((clave: string, valores?: Record<string, string | number>) => traducir(clave, idioma, valores), [idioma]);

  return { t, idioma };
}
