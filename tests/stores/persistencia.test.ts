import { describe, expect, it } from "vitest";
import { useTripStore } from "../../src/stores/useTripStore";

/**
 * Lo que el usuario escribe tiene que sobrevivir a cerrar la app.
 *
 * El bote se vaciaba al recargar: existía en memoria pero nunca se guardaba,
 * porque al añadirlo al estado se me olvidó añadirlo a la lista de lo que se
 * persiste. Este test cubre esa clase de fallo entera, no sólo ese campo.
 */
const DEBE_GUARDARSE = [
  "trip",
  "stopsById",
  "places",
  "expenses",
  "aportaciones",
  "refuels",
  "favorites",
  "notes",
  "checklist",
  "achievementsState",
  "savedTrips",
] as const;

describe("qué sobrevive a recargar la app", () => {
  const guardado = () => Object.keys(useTripStore.persist.getOptions().partialize!(useTripStore.getState()) as object);

  it.each(DEBE_GUARDARSE)("guarda %s", (clave) => {
    expect(guardado()).toContain(clave);
  });

  it("guarda el bote con su contenido, no una lista vacía", () => {
    useTripStore.getState().addAportacion("viajero-1", 300);
    const persistido = useTripStore.persist.getOptions().partialize!(useTripStore.getState()) as { aportaciones?: unknown[] };

    expect(persistido.aportaciones).toHaveLength(1);
    expect(persistido.aportaciones?.[0]).toMatchObject({ travelerId: "viajero-1", amountEUR: 300 });
  });

  it("no guarda lo que es de esta sesión y no del viaje", () => {
    // El historial de deshacer y los logros recién saltados no deben volver
    // al abrir la app: son del rato, no del viaje.
    const claves = guardado();
    expect(claves).not.toContain("history");
    expect(claves).not.toContain("newlyUnlockedAchievementIds");
  });
});
