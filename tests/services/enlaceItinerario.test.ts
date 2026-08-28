import { describe, expect, it } from "vitest";
import { desempaquetar, empaquetar } from "../../src/services/sharing/enlaceItinerario";
import type { Stop, Trip } from "../../src/types";

function viaje(): { trip: Trip; stopsById: Record<string, Stop> } {
  const stopsById: Record<string, Stop> = {
    a: { id: "a", name: "Catedral", category: "cultura", enabled: true, recommendedDurationMinutes: 60, coordinates: { latitude: 43.263012345, longitude: -2.935098765 } } as Stop,
    b: { id: "b", name: "Playa", category: "playa", enabled: true, recommendedDurationMinutes: 90, coordinates: { latitude: 43.32, longitude: -1.98 } } as Stop,
    c: { id: "c", name: "Desactivada", category: "cultura", enabled: false, recommendedDurationMinutes: 30, coordinates: { latitude: 43.1, longitude: -2.1 } } as Stop,
  };
  const trip = {
    name: "Euskadi",
    startDate: "2026-08-29",
    days: [{ id: "d1", stopIds: ["a", "c"] }, { id: "d2", stopIds: ["b"] }],
  } as Trip;
  return { trip, stopsById };
}

describe("empaquetar", () => {
  it("recoge las paradas con su día", () => {
    const { trip, stopsById } = viaje();
    const c = empaquetar(trip, stopsById);

    expect(c.n).toBe("Euskadi");
    expect(c.p.map((f) => [f[0], f[1]])).toEqual([[1, "Catedral"], [2, "Playa"]]);
  });

  it("deja fuera las paradas desactivadas", () => {
    const { trip, stopsById } = viaje();
    expect(empaquetar(trip, stopsById).p.some((f) => f[1] === "Desactivada")).toBe(false);
  });

  it("recorta las coordenadas a cinco decimales", () => {
    // Cinco decimales es poco más de un metro; los otros nueve sólo alargan
    // el enlace, que es justo lo que lo rompe al enviarlo.
    const { trip, stopsById } = viaje();
    expect(empaquetar(trip, stopsById).p[0][2]).toBe(43.26301);
  });
});

describe("desempaquetar", () => {
  it("da la vuelta a lo empaquetado", () => {
    const { trip, stopsById } = viaje();
    const leido = desempaquetar(empaquetar(trip, stopsById))!;

    expect(leido.nombre).toBe("Euskadi");
    expect(leido.dias).toBe(2);
    expect(leido.paradas).toHaveLength(2);
  });

  it("rechaza lo que no es un itinerario", () => {
    for (const basura of [null, "hola", 42, {}, { v: 9 }, { v: 1, n: "x" }]) {
      expect(desempaquetar(basura)).toBeNull();
    }
  });

  it("descarta paradas con coordenadas imposibles", () => {
    // Un enlace lo manda cualquiera; nada se da por bueno.
    const leido = desempaquetar({ v: 1, n: "X", d: "2026-01-01", p: [[1, "Buena", 40, -3, "ciudad", 60], [1, "Mala", 999, 0, "ciudad", 60]] });
    expect(leido?.paradas.map((p) => p.nombre)).toEqual(["Buena"]);
  });

  it("devuelve null si no queda ninguna parada válida", () => {
    expect(desempaquetar({ v: 1, n: "X", d: "2026-01-01", p: [[1, "Mala", 999, 0, "ciudad", 60]] })).toBeNull();
  });

  it("recorta nombres desmedidos en vez de aceptarlos", () => {
    const leido = desempaquetar({ v: 1, n: "N".repeat(500), d: "2026-01-01", p: [[1, "P".repeat(500), 40, -3, "ciudad", 60]] })!;
    expect(leido.nombre.length).toBeLessThanOrEqual(80);
    expect(leido.paradas[0].nombre.length).toBeLessThanOrEqual(120);
  });

  it("pone valores por defecto cuando faltan categoría o duración", () => {
    const leido = desempaquetar({ v: 1, n: "X", d: "2026-01-01", p: [[1, "Sitio", 40, -3, "", NaN]] })!;
    expect(leido.paradas[0].categoria).toBe("ciudad");
    expect(leido.paradas[0].minutos).toBe(60);
  });
});
