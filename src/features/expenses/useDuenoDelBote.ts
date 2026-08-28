import { quienLlenaElBote } from "../../services/expenses/bote";
import { useTripStore } from "../../stores/useTripStore";

/**
 * El nombre de quien llena el bote, cuando lo llena una sola persona.
 *
 * Marcar un gasto como "del bote" no dice de quién sale ese dinero, y con un
 * solo dueño la duda es constante: si Yulia adelantó 200 €, poner "bote" y
 * poner "Yulia" es exactamente lo mismo, pero en pantalla no lo parecía y
 * había que fiarse de la resta para creérselo.
 *
 * Con varios dueños no hay un nombre que valga: el gasto sale del dinero de
 * todos ellos, y ahí el desglose de "Quién ha puesto qué" es quien lo explica.
 */
export function useDuenoDelBote(): string | null {
  const aportaciones = useTripStore((s) => s.aportaciones);
  const travelers = useTripStore((s) => s.trip.travelers);

  const id = quienLlenaElBote(aportaciones);
  return id ? (travelers.find((t) => t.id === id)?.name ?? null) : null;
}
