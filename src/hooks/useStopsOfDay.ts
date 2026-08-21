import { useMemo } from "react";
import { useTripStore } from "../stores/useTripStore";
import type { ID, Stop } from "../types";

const EMPTY_IDS: ID[] = [];

/**
 * Selector reactivo estable para "paradas de un día". `useTripStore.stopsOfDay`
 * (el método del store) recalcula un array nuevo en cada llamada, lo que
 * rompe `useSyncExternalStore` si se usa directamente como selector de un
 * hook (React ve una snapshot distinta en cada comprobación y entra en bucle
 * de renders). Aquí nos suscribimos a las dos piezas de estado realmente
 * estables (`stopIds` y `stopsById`) y memoizamos la combinación.
 */
export function useStopsOfDay(dayId: string | null | undefined): Stop[] {
  const stopIds = useTripStore((s) => (dayId ? (s.trip.days.find((d) => d.id === dayId)?.stopIds ?? EMPTY_IDS) : EMPTY_IDS));
  const stopsById = useTripStore((s) => s.stopsById);

  return useMemo(() => stopIds.map((id) => stopsById[id]).filter((s): s is Stop => Boolean(s)), [stopIds, stopsById]);
}
