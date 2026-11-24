/** Las pestañas de abajo, en el orden en que se ven. */
export const PESTANAS = ["/mapa", "/itinerario", "/diario", "/gastos", "/mas"] as const;

export function indicePestana(ruta: string): number {
  return PESTANAS.findIndex((t) => ruta === t || ruta.startsWith(`${t}/`));
}

/**
 * Hacia dónde se mueve la pantalla al navegar.
 *
 * Entre pestañas manda su orden: ir del Mapa a Gastos es ir a la derecha y
 * volver al Mapa, a la izquierda. En lo demás, atrás (el botón del sistema o
 * el del navegador) vuelve desde la izquierda y todo lo demás avanza.
 */
export function claseDeTransicion(ruta: string, tipo: "POP" | "PUSH" | "REPLACE", estado: unknown): string {
  const desde = (estado as { tabDesde?: number } | null)?.tabDesde;
  const hasta = PESTANAS.indexOf(ruta as (typeof PESTANAS)[number]);
  if (desde != null && desde >= 0 && hasta >= 0 && desde !== hasta) return hasta < desde ? "pantalla-vuelve" : "pantalla-avanza";
  return tipo === "POP" ? "pantalla-vuelve" : "pantalla-avanza";
}
