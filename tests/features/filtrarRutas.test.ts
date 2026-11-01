import { describe, expect, it } from "vitest";
import { FILTROS_VACIOS, filtrarRutas, kmDeRuta, normalizar, paisesDe } from "../../src/features/explore/filtrarRutas";
import type { RouteTemplate } from "../../src/types";

function ruta(parcial: Partial<RouteTemplate> & { id: string }): RouteTemplate {
  return {
    name: parcial.id,
    region: "",
    summary: "",
    dayCount: 1,
    stops: [{ name: "A", category: "pueblo", coordinates: { latitude: 40, longitude: -3 }, shortDescription: "", recommendedDurationMinutes: 60, dayIndex: 1 }],
    ...parcial,
  };
}

const CATALOGO: RouteTemplate[] = [
  ruta({ id: "costa-brava", name: "Costa Brava", country: "España", tipo: "roadtrip", tags: ["costa"], dayCount: 4,
    stops: [
      { name: "Girona", category: "ciudad", coordinates: { latitude: 41.98, longitude: 2.82 }, shortDescription: "", recommendedDurationMinutes: 60, dayIndex: 1 },
      { name: "Cadaqués", category: "pueblo", coordinates: { latitude: 42.29, longitude: 3.28 }, shortDescription: "", recommendedDurationMinutes: 60, dayIndex: 2 },
    ] }),
  ruta({ id: "toscana", name: "Toscana", country: "Italia", tipo: "roadtrip", tags: ["vino", "pueblos"], dayCount: 5 }),
  ruta({ id: "escapada", name: "Desde Bilbao", country: "España", tipo: "escapada", tags: ["costa"], dayCount: 1 }),
  ruta({ id: "madrid", name: "Madrid", country: "España", tipo: "ciudad", tags: ["cultura"], dayCount: 3 }),
];

describe("filtrarRutas", () => {
  it("returns everything with no filters, in catalogue order", () => {
    expect(filtrarRutas(CATALOGO, FILTROS_VACIOS).map((r) => r.id)).toEqual(["costa-brava", "toscana", "escapada", "madrid"]);
  });

  it("finds a route by one of its stops, ignoring accents and case", () => {
    expect(filtrarRutas(CATALOGO, { ...FILTROS_VACIOS, texto: "cadaques" }).map((r) => r.id)).toEqual(["costa-brava"]);
  });

  it("filters by type, duration, theme and country together", () => {
    const f = { ...FILTROS_VACIOS, tipo: "roadtrip" as const, duracion: "4-5" as const, tema: "costa" as const, pais: "España" };
    expect(filtrarRutas(CATALOGO, f).map((r) => r.id)).toEqual(["costa-brava"]);
    expect(filtrarRutas(CATALOGO, { ...FILTROS_VACIOS, duracion: "1" }).map((r) => r.id)).toEqual(["escapada"]);
  });

  it("sorts shortest first", () => {
    expect(filtrarRutas(CATALOGO, { ...FILTROS_VACIOS, orden: "cortas" })[0].id).toBe("escapada");
  });

  it("sorts by distance from the user when asked", () => {
    const enGirona = { latitude: 41.98, longitude: 2.82 };
    expect(filtrarRutas(CATALOGO, { ...FILTROS_VACIOS, orden: "cerca" }, enGirona)[0].id).toBe("costa-brava");
  });

  it("does not mutate the catalogue when sorting", () => {
    const copia = [...CATALOGO];
    filtrarRutas(CATALOGO, { ...FILTROS_VACIOS, orden: "largas" });
    expect(CATALOGO).toEqual(copia);
  });
});

describe("helpers", () => {
  it("normalizes accents", () => expect(normalizar("  Cádiz ")).toBe("cadiz"));
  it("adds up straight-line km between stops", () => expect(kmDeRuta(CATALOGO[0])).toBeGreaterThan(40));
  it("lists Spain first", () => expect(paisesDe(CATALOGO)).toEqual(["España", "Italia"]));
});
