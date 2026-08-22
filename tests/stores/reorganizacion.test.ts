import { describe, expect, it } from "vitest";
import { CIUDADES_POR_DIA, PLAN_POR_CIUDADES } from "../../src/data/reorganizacion.data";
import { SEED_STOPS } from "../../src/data/stops.data";
import { SEED_TRIP } from "../../src/data/trip.data";

describe("plan de reorganización por ciudades", () => {
  it("only references stops that exist", () => {
    const existentes = new Set(SEED_STOPS.map((s) => s.id));
    for (const id of Object.keys(PLAN_POR_CIUDADES)) {
      expect(existentes.has(id), `${id} no existe en el itinerario`).toBe(true);
    }
  });

  it("leaves no stop behind: every seeded stop has a day", () => {
    for (const parada of SEED_STOPS) {
      expect(PLAN_POR_CIUDADES[parada.id], `${parada.name} se quedaría sin sitio`).toBeDefined();
    }
  });

  it("uses only days the trip actually has", () => {
    for (const [id, destino] of Object.entries(PLAN_POR_CIUDADES)) {
      expect(destino.dia, id).toBeGreaterThanOrEqual(1);
      expect(destino.dia, id).toBeLessThanOrEqual(SEED_TRIP.days.length);
    }
  });

  it("gives each day a consecutive order with no gaps or repeats", () => {
    const porDia = new Map<number, number[]>();
    for (const destino of Object.values(PLAN_POR_CIUDADES)) {
      porDia.set(destino.dia, [...(porDia.get(destino.dia) ?? []), destino.orden]);
    }
    for (const [dia, ordenes] of porDia) {
      const esperado = Array.from({ length: ordenes.length }, (_, i) => i);
      expect([...ordenes].sort((a, b) => a - b), `día ${dia}`).toEqual(esperado);
    }
  });

  it("names a city for every day of the trip", () => {
    for (let dia = 1; dia <= SEED_TRIP.days.length; dia++) {
      expect(CIUDADES_POR_DIA[dia]?.city, `día ${dia}`).toBeTruthy();
    }
  });

  it("keeps the visits per day within what a day can hold", () => {
    // El hotel no cuenta: no es una visita, es dónde duermes. Contándolo, un
    // día con doce visitas y su alojamiento daba falso positivo.
    const esHotel = new Map(SEED_STOPS.map((s) => [s.id, s.category === "hotel"]));
    const cuenta = new Map<number, number>();
    for (const [id, destino] of Object.entries(PLAN_POR_CIUDADES)) {
      if (esHotel.get(id)) continue;
      cuenta.set(destino.dia, (cuenta.get(destino.dia) ?? 0) + 1);
    }
    for (const [dia, total] of cuenta) {
      expect(total, `día ${dia} tiene ${total} visitas`).toBeLessThanOrEqual(12);
    }
  });
});
