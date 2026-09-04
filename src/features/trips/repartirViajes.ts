import type { TripSummary } from "../../stores/useTripStore";

export interface Reparto {
  /** El que está abierto ahora mismo. Siempre grande y arriba del todo. */
  activo: TripSummary | null;
  /** Los que aún no han terminado: siguen siendo planes. */
  proximos: TripSummary[];
  /** Los que ya pasaron: van a la pila. */
  terminados: TripSummary[];
}

/**
 * Quién va grande arriba, quién va en medio y quién va a la pila.
 *
 * El activo va arriba **aunque ya haya terminado**, y por eso se mira antes
 * que las fechas: el día después de volver de un viaje sigue siendo el viaje
 * que estás mirando —las fotos, los gastos por cuadrar—, y mandarlo al fondo
 * de la pila justo entonces sería esconder lo único que se va a abrir esa
 * semana.
 *
 * `hoy` se pasa desde fuera en vez de leer el reloj aquí: así la decisión se
 * puede probar sin depender del día en que se ejecuten las pruebas.
 */
export function repartirViajes(viajes: TripSummary[], hoy: string): Reparto {
  const activo = viajes.find((v) => v.isActive) ?? null;
  const resto = viajes.filter((v) => v !== activo);

  return {
    activo,
    proximos: resto.filter((v) => v.endDate >= hoy),
    terminados: resto.filter((v) => v.endDate < hoy),
  };
}
