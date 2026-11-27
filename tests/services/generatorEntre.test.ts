import { describe, expect, it } from "vitest";
import { puntosAlLargo, repartirPorTramos } from "../../src/services/generator/ItineraryGeneratorService";

const GIRONA = { latitude: 41.98, longitude: 2.82 };
const BILBAO = { latitude: 43.26, longitude: -2.93 };

function candidata(name: string, progreso: number, relevancia: number) {
  return { name, category: "historia" as const, coordinates: GIRONA, dayIndex: 1, recommendedDurationMinutes: 60, relevancia, progreso };
}

describe("puntosAlLargo", () => {
  it("spreads points evenly between both ends, without the ends", () => {
    const puntos = puntosAlLargo([GIRONA, BILBAO], 3);
    expect(puntos.map((p) => p.progreso)).toEqual([0.25, 0.5, 0.75]);
    expect(puntos[0].punto.longitude).toBeLessThan(GIRONA.longitude);
    expect(puntos[2].punto.longitude).toBeGreaterThan(BILBAO.longitude);
  });

  it("returns nothing for a path that is not a path", () => {
    expect(puntosAlLargo([GIRONA], 3)).toEqual([]);
  });
});

describe("repartirPorTramos", () => {
  it("puts each place on the day of its stretch, best known first, in driving order", () => {
    const paradas = repartirPorTramos(
      [candidata("poco conocida", 0.1, 1), candidata("famosa", 0.3, 50), candidata("media", 0.2, 20), candidata("al final", 0.9, 5)],
      2,
      2,
    );
    expect(paradas.map((p) => [p.name, p.dayIndex])).toEqual([
      ["media", 1],
      ["famosa", 1],
      ["al final", 2],
    ]);
    expect(paradas.every((p) => !("progreso" in p))).toBe(true);
  });
});
